// Imports
import Koa from 'koa';
import os from 'os';
import stream from 'stream';
import defaultsDeep from 'lodash.defaultsdeep';
import assign from 'lodash.assign';
import get from 'lodash.get';
import Pino from 'pino';
import cls from 'cls-hooked';
import delegate from 'delegates';
import { MultiError } from 'verror';
import { IncomingMessage, ServerResponse } from 'http';
import uuidv4 from 'uuid';
import createLogger from './createLogger';
import Service from './Service';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';
import setTransactionContext from '../middlewares/setTransactionContext';
import requestLogger from '../middlewares/requestLogger';
import errorHandler from '../middlewares/errorHandler';
import ensureStarted from '../middlewares/ensureStarted';
import Signals = NodeJS.Signals;

// tslint:disable-next-line no-var-requires
const { name } = require('../../package.json');

// Types
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer SU>
    ? ReadonlyArray<DeepPartial<SU>>
    : DeepPartial<T[P]>
};

/**
 * Overload Koa by extending Komapi for simple module augmentation
 */
declare module 'koa' {
  interface Application<CustomStateT = any, CustomContextT = {}> extends Komapi<CustomStateT, CustomContextT> {}
  interface BaseRequest extends Komapi.BaseRequest {}
  interface BaseResponse extends Komapi.BaseResponse {}
  interface BaseContext extends Komapi.BaseContext {}

  // Add augmentation helpers
  interface Request extends Komapi.Request {}
  interface Response extends Komapi.Response {}
  interface Context extends Komapi.Context {}
}

/**
 * Komapi base class
 *
 */
interface Komapi<CustomStateT = {}, CustomContextT = {}, CustomServicesT extends Komapi.Services = Komapi.Services> {
  use<NewCustomStateT = {}, NewCustomContextT = {}, NewCustomServicesT extends Komapi.Services = Komapi.Services>(
    middleware: Komapi.Middleware<
      CustomStateT & NewCustomStateT,
      CustomContextT & NewCustomContextT,
      CustomServicesT & NewCustomServicesT
    >,
  ): Komapi<CustomStateT & NewCustomStateT, CustomContextT & NewCustomContextT, CustomServicesT & NewCustomServicesT>;
}
class Komapi<
  CustomStateT = {},
  CustomContextT = {},
  CustomServicesT extends Komapi.Services = Komapi.Services
> extends Koa<CustomStateT, CustomContextT> {
  /**
   * Export helper functions by attaching to Komapi (hack to make it work with named import and module augmentation)
   */
  public static Service = Service;

  /**
   * Public instance properties
   */
  public readonly config: Komapi.Options['config'];
  public readonly services: Komapi.InstantiatedServices<CustomServicesT>;
  public readonly transactionContext: cls.Namespace;
  public state: Komapi.LifecycleState = Komapi.LifecycleState.STOPPED;
  public log: Pino.Logger;
  public lifecycleHandlers: Array<Komapi.LifecycleHandlerSubscription<this>> = [];

  /**
   * Internal instance properties
   */
  protected waitForState: Promise<void> = Promise.resolve();

  /**
   * Create a new Komapi instance
   *
   * @param {DeepPartial<Komapi.Options>=} options
   */
  constructor(options?: DeepPartial<Komapi.Options>) {
    super();

    // Set options
    const opts = defaultsDeep({}, options, {
      config: {
        env: this.env,
        proxy: this.proxy,
        silent: this.silent,
        keys: this.keys,
        subdomainOffset: this.subdomainOffset,
        instanceId: process.env.HEROKU_DYNO_ID || name,
      },
      services: {},
      logOptions: {
        // useLevelLabels: true,
        level: process.env.LOG_LEVEL || 'info',
        base: {
          pid: process.pid,
          hostname: os.hostname(),
          env: get(options, 'config.env', this.env),
        },
        serializers: {
          err: (err: Error | MultiError) => {
            const serializedError = Pino.stdSerializers.err(err);
            serializedError.errors = isMultiError(err) ? err.errors().map(Pino.stdSerializers.err) : undefined;
            return serializedError;
          },
          request: serializeRequest(),
          response: serializeResponse(),
        },
        redact: {
          paths: ['request.header.authorization', 'request.header.cookie'],
          censor: '[REDACTED]',
        },
      },
      logStream: Pino.destination(),
    });

    /**
     * Integrate with Koa
     */
    {
      ['env', 'subdomainOffset', 'proxy', 'silent', 'keys'].forEach(prop => {
        Object.defineProperty(this, prop, {
          get: () => (this.config as { [key: string]: any })[prop],
          set: v => {
            (this.config as { [key: string]: any })[prop] = v;
          },
        });
      });
      Object.assign(this.request, {
        requestId: 'UNKNOWN',
      });
      Object.assign(this.response, {
        send: function send(body) {
          this.body = body;
          return this.body;
        },
      } as Koa.Response);
      delegate<Koa.BaseContext, Koa.Request>(this.context, 'request')
        .access('startAt')
        .access('requestId');
      delegate<Koa.BaseContext, Koa.Response>(this.context, 'response').access('send');
      delegate<Koa.BaseContext, Koa.Application>(this.context, 'app').access('log');
    }

    /**
     * Initialization
     */
    {
      // Set config
      this.config = opts.config;

      // Create namespace
      this.transactionContext = cls.createNamespace(this.config.instanceId);

      // Create logger
      this.log = createLogger(this.transactionContext, opts.logOptions, opts.logStream);

      // Instantiate services
      this.services = Object.entries(opts.services).reduce(
        (acc, [k, v]: [string, any]) => {
          acc[k] = new v(this);
          return acc;
        },
        {} as any,
      );
    }

    /**
     * Set up event handlers
     */
    {
      // Log emitted errors
      this.on('error', (err, ctx) => {
        this.log.error({ ctx, err, app: this }, 'Application Error Event');
      });

      // Graceful shutdown
      Object.entries({
        SIGHUP: 128 + 1,
        SIGINT: 128 + 2,
        SIGTERM: 128 + 15,
        SIGBREAK: 128 + 21,
      } as { [key in Signals]: number }).forEach(([signal, code]) =>
        process.once(signal as Signals, async () => {
          try {
            this.log = Pino.final(this.log);
            await this.stop();
            process.exit(code);
          } catch (err) {
            this.log.fatal(
              { err, app: this, metadata: { signal } },
              `Failed to handle \`${signal}\` gracefully. Exiting with status code 1`,
            );
            process.exit(1);
          }
        }),
      );

      // PM2 Graceful shutdown
      process.on('message', async msg => {
        if (msg === 'shutdown') {
          try {
            this.log = Pino.final(this.log);
            await this.stop();
            process.exit(0);
          } catch (err) {
            this.log.fatal(
              { err, app: this, metadata: { msg } },
              `Failed to handle message \`${msg}\` gracefully. Exiting with status code 1`,
            );
            process.exit(1);
          }
        }
      });

      // Handle application state inconsistencies
      process.once('uncaughtException', async err => {
        this.log = Pino.final(this.log);
        this.log.fatal({ err, app: this }, 'Uncaught Exception Error - Stopping application to prevent instability');
        await this.stop();
        process.exit(1);
      });
      process.once('unhandledRejection', async (err, promise) => {
        this.log = Pino.final(this.log);
        this.log.fatal(
          { err, app: this, metadata: { promise } },
          'Unhandled Rejected Promise - Stopping application to prevent instability',
        );
        await this.stop();
        process.exit(1);
      });
      process.once('multipleResolves', async (type, promise, value) => {
        this.log = Pino.final(this.log);
        this.log.fatal(
          { app: this, metadata: { type, promise, value } },
          'Promise resolved or rejected more than once - Stopping application to prevent instability',
        );
        await this.stop();
        process.exit(1);
      });

      // Listen for warnings
      process.on('warning', warning => {
        this.log.warn(
          { app: this, stack: warning.stack, metadata: { message: warning.message } },
          'NodeJS warning detected - see metadata and stack property for more information',
        );
      });

      // Add close handler for graceful exits
      process.once('beforeExit', async () => {
        this.log = Pino.final(this.log);
        this.log.debug({ app: this }, 'Before exit event triggered - ensuring graceful shutdown');

        // Stop application
        await this.stop();
      });
    }

    /**
     * Wire it all up
     */
    {
      // Add default middlewares
      this.middleware.push(setTransactionContext(this.transactionContext));
      this.middleware.push(requestLogger());
      this.middleware.push(errorHandler());
      this.middleware.push(ensureStarted());
    }
  }

  /**
   * Add handlers after other handlers
   * Returns a function to remove the added handlers
   *
   * @returns {() => void}
   */
  public addLifecycleHandler(...handlers: Array<Komapi.LifecycleHandlerSubscription<this>>): () => void {
    handlers.forEach(handler => this.lifecycleHandlers.push(handler));
    return () => {
      this.lifecycleHandlers = this.lifecycleHandlers.filter(handler => !handlers.includes(handler));
    };
  }

  /**
   * Add handlers before other handlers
   * Returns a function to remove the added handlers
   *
   * @returns {() => void}
   */
  public addLifecycleHandlerBefore(...handlers: Array<Komapi.LifecycleHandlerSubscription<this>>): () => void {
    handlers
      .slice(0)
      .reverse()
      .forEach(handler => this.lifecycleHandlers.unshift(handler));
    return () => {
      this.lifecycleHandlers = this.lifecycleHandlers.filter(handler => !handlers.includes(handler));
    };
  }

  /**
   * Start the application - safe to be called multiple times to ensure STARTED state
   *
   * @params {Partial<Komapi.LifecycleActionOptions<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>=} options
   * @returns {Promise<void>}
   */
  public async start(options?: Partial<Komapi.LifecycleActionOptions<this>>) {
    // Init
    const opts: Komapi.LifecycleActionOptions<this> = assign(
      { handlers: this.lifecycleHandlers, force: false },
      options,
    );

    // Check if we should short circuit early or wait for application to stop
    if (!opts.force) {
      if (this.state === Komapi.LifecycleState.STOPPING) await this.stop();
      else if (this.state !== Komapi.LifecycleState.STOPPED) return this.waitForState;
    }
    // Fetch start time
    const preStartTime = Date.now();

    // Fetch lifecycle handlers
    const handlers = opts.handlers;

    // Log it
    this.log.debug({ metadata: { startHandlers: handlers.length } }, 'Starting application');

    // Set STARTING state
    this.state = Komapi.LifecycleState.STARTING;

    // Run handlers
    this.waitForState = new Promise(async (resolve, reject) => {
      // Call handlers
      for (const [index, handler] of handlers.entries()) {
        // Ensure start handler exists
        if (handler.start) {
          const startTime = Date.now();
          const startHandler = handler.start;
          const handlerName = handler.name || startHandler.name;

          try {
            const output = await startHandler(this);

            // Log it
            this.log.trace(
              {
                metadata: {
                  output,
                  name: handlerName,
                  hasRollbackHandler: !!handler.stop,
                  duration: Date.now() - startTime,
                },
              },
              'Lifecycle start handler called',
            );
          } catch (err) {
            // Log the error
            this.log.error(
              {
                err,
                metadata: { name: handlerName, duration: Date.now() - startTime },
              },
              'Lifecycle start handler failed - rolling back entire start sequence by stopping the application with stop handlers only for completed lifecycle handlers',
            );

            // Fetch rollback handlers
            const rollbackHandlers = handlers.slice(0, index).reverse();

            // Stop application
            await this.stop({ handlers: rollbackHandlers, force: true });

            // Reject
            return reject(err);
          }
        }
      }

      // Done
      return resolve();
    })
      .then(() => {
        // Log it
        this.log.debug(
          { metadata: { startHandlers: handlers.length, duration: Date.now() - preStartTime } },
          'Application started',
        );
        this.state = Komapi.LifecycleState.STARTED;
      })
      .catch(err => {
        // Log it
        this.log.error(
          { err, metadata: { startHandlers: handlers.length, duration: Date.now() - preStartTime } },
          'Application failed to start',
        );
        throw err;
      });

    // Return starting promise
    return this.waitForState;
  }

  /**
   * Stop the application - safe to be called multiple times to ensure STOPPED state.
   * Note that lifecycle handlers must be sent in the order to be called.
   * This is usually reverse of what you send to the start method.
   *
   * @params {Partial<Komapi.LifecycleActionOptions<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>=} options
   * @returns {Promise<void>}
   */
  public async stop(options?: Partial<Komapi.LifecycleActionOptions<this>>) {
    // Init
    const opts: Komapi.LifecycleActionOptions<this> = assign(
      { handlers: this.lifecycleHandlers.slice(0).reverse(), force: false },
      options,
    );

    // Check if we should short circuit early or wait for application to stop
    if (!opts.force) {
      if (this.state === Komapi.LifecycleState.STARTING) await this.start();
      else if (this.state !== Komapi.LifecycleState.STARTED) return this.waitForState;
    }
    // Fetch start time
    const preStopTime = Date.now();

    // Fetch lifecycle handlers
    const handlers = opts.handlers;

    // Log it
    this.log.debug({ metadata: { stopHandlers: handlers.length } }, 'Stopping application');

    // Set STARTING state
    this.state = Komapi.LifecycleState.STOPPING;

    // Run handlers
    this.waitForState = new Promise<void>(async (resolve, reject) => {
      // Capture errors - but do not fail to ensure that cleanup is done where possible
      const errors = [];

      // Call handlers
      for (const handler of handlers) {
        // Ensure stop handler exists
        if (handler.stop) {
          const startTime = Date.now();
          const stopHandler = handler.stop;
          const handlerName = handler.name || stopHandler.name;

          try {
            const output = await stopHandler(this);

            // Log it
            this.log.trace(
              { metadata: { output, name: handlerName, duration: Date.now() - startTime } },
              'Lifecycle stop handler called',
            );
          } catch (err) {
            errors.push(err);

            // Log the error
            this.log.warn(
              {
                err,
                metadata: { name: handlerName, duration: Date.now() - startTime },
              },
              'Lifecycle stop handler failed - ignoring error to ensure cleanup of remaining resources',
            );
          }
        }
      }

      // Did we encounter any errors?
      if (errors.length === 0) return resolve();
      const err = new MultiError(errors);

      // Log the error
      this.log.error({ err, numErrors: errors.length }, 'Encountered errors while stopping application');

      // Reject
      reject(err);
    })
      .then(() => {
        // Log it
        this.log.debug(
          { metadata: { stopHandlers: handlers.length, duration: Date.now() - preStopTime } },
          'Application stopped',
        );
      })
      .catch(err => {
        // Log it
        this.log.error(
          { err, metadata: { stopHandlers: handlers.length, duration: Date.now() - preStopTime } },
          'Application failed to stop gracefully',
        );
        throw err;
      })
      .finally(() => {
        this.state = Komapi.LifecycleState.STOPPED;
      });

    // Return starting promise
    return this.waitForState;
  }

  /**
   * Run a function with transaction context and ensuring the correct lifecycle state
   *
   * @param {() => any} func
   */
  public async run<ReturnValue = any>(func: () => any): Promise<ReturnValue> {
    // Ensure application is ready
    await this.start();

    // Run the function with context
    return new Promise(resolve => {
      this.transactionContext.run(async () => {
        const res = await func();
        resolve(res);
      });
    });
  }

  /**
   * @override
   */
  public createContext(req: IncomingMessage, res: ServerResponse) {
    const ctx = super.createContext(req, res);
    const requestId = (this.proxy && ctx.request.get('x-request-id')) || uuidv4();

    // Update request
    Object.assign(ctx.request, {
      requestId,
      startAt: Date.now(),
    });

    // Update response
    Object.assign(ctx.response, {
      send: ctx.response.send.bind(ctx.response),
    });

    return ctx;
  }

  /**
   * @override
   */
  public listen(...args: any[]) {
    const server = super.listen(...args);

    // TODO: Ensure that connections are cleared up within a reasonable time (track sockets and forcefully close them)
    // tslint:disable-next-line ter-prefer-arrow-callback
    this.addLifecycleHandler({
      name: 'closeHttpServer',
      stop: () => new Promise(resolve => server.close(resolve)),
    });

    // Start the application in the background
    this.start();

    // Return the http server
    return server;
  }
}

/**
 * Namespace
 */
declare namespace Komapi {
  /**
   * User customizable types
   */
  export interface Services {
    [name: string]: ConstructableService<Service>;
  }

  /**
   * Komapi native types
   */
  export const enum LifecycleState {
    STARTING = 'STARTING',
    STARTED = 'STARTED',
    STOPPING = 'STOPPING',
    STOPPED = 'STOPPED',
  }
  export type LifecycleHandler<Application = Komapi> = (app: Application) => any;
  export interface LifecycleHandlerSubscription<Application = Komapi> {
    name?: string;
    start?: LifecycleHandler<Application>;
    stop?: LifecycleHandler<Application>;
  }
  export type Middleware<
    CustomStateT = {},
    CustomContextT = {},
    CustomServicesT extends Services = Services
  > = Koa.Middleware<CustomStateT, ContextBridge<CustomContextT, CustomServicesT>>;
  export type InstantiatedServices<T extends Services = Services> = { [P in keyof T]: InstanceType<T[P]> };
  export type ConstructableService<T extends Service> = new (...args: any[]) => T;
  export type ContextBridge<CustomContextT = {}, CustomServicesT extends Services = Services> = CustomContextT & {
    app: Komapi<{}, {}, CustomServicesT>;
  };
  export interface Options {
    config: {
      env: Koa['env'];
      proxy: Koa['proxy'];
      subdomainOffset: Koa['subdomainOffset'];
      silent: Koa['silent'];
      keys: Koa['keys'];
      instanceId: string;

      // errorHandler: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
      // requestLogger: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
      // healthReporter: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
    };
    services: Services;
    logOptions: Pino.LoggerOptions;
    logStream: stream.Writable | stream.Duplex | stream.Transform;
  }
  export interface LifecycleActionOptions<Application = Komapi> {
    force: boolean;
    handlers: Array<LifecycleHandlerSubscription<Application>>;
  }
  export interface BaseRequest {
    requestId: string;
    startAt: number;
  }
  export interface BaseResponse {
    requestId: string;
    startAt: number;
    send: <T extends Koa.Response['body'] = Koa.Response['body']>(body: T) => T;
  }
  export interface BaseContext {
    log: Komapi['log'];
    requestId: BaseRequest['requestId'];
    send: BaseResponse['send'];
    startAt: BaseRequest['startAt'];
  }
  export interface Request {}
  export interface Response {}
  export interface Context {}
}

// Typeguards
function isMultiError(error: Error): error is MultiError {
  return 'errors' in error;
}

// Exports
export = Komapi;
