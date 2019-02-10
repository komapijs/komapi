// Imports
import Koa from 'koa';
import os from 'os';
import stream from 'stream';
import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';
import Pino from 'pino';
import cls from 'cls-hooked';
import delegate from 'delegates';
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

  /**
   * Internal instance properties
   */
  protected waitForStartedState: Promise<void> = Promise.resolve();
  protected readonly startHandlers: Array<
    Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>
  > = [];
  protected readonly stopHandlers: Array<
    Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>
  > = [];

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
          err: Pino.stdSerializers.err,
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
   * Add handlers before other handlers
   *
   * @returns {Promise<this>}
   */
  public onBeforeStart(
    ...handlers: Array<Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>
  ): this {
    handlers
      .slice(0)
      .reverse()
      .forEach(handler => this.startHandlers.unshift(handler));
    return this;
  }

  /**
   * Add handlers after other handlers
   *
   * @returns {Promise<this>}
   */
  public onStart(
    ...handlers: Array<Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>
  ): this {
    handlers.forEach(handler => this.startHandlers.push(handler));
    return this;
  }

  /**
   * Add handlers before other handlers
   *
   * @returns {Promise<this>}
   */
  public onStop(
    ...handlers: Array<Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>
  ): this {
    handlers
      .slice(0)
      .reverse()
      .forEach(handler => this.stopHandlers.unshift(handler));
    return this;
  }

  /**
   * Add handlers after other handlers
   *
   * @returns {Promise<this>}
   */
  public onAfterStop(
    ...handlers: Array<Komapi.LifecycleHandler<Komapi<CustomStateT, CustomContextT, CustomServicesT>>>
  ): this {
    handlers.forEach(handler => this.stopHandlers.push(handler));
    return this;
  }

  /**
   * Start the application - safe to be called multiple times to ensure STARTED state
   *
   * @returns {Promise<void>}
   */
  public async start(): Promise<void> {
    // Check if we should short circuit early
    if (this.state === Komapi.LifecycleState.STARTED) return;
    if (this.state === Komapi.LifecycleState.STOPPING)
      throw new Error('Cannot start application while in `STOPPING` state');
    else if (this.state === Komapi.LifecycleState.STARTING) return this.waitForStartedState;

    // Set STARTING state
    this.state = Komapi.LifecycleState.STARTING;
    this.waitForStartedState = new Promise(async resolve => {
      // Call lifecycle handlers
      for (const handler of this.startHandlers) {
        await handler(this);
      }

      // Set new STARTED state
      this.state = Komapi.LifecycleState.STARTED;
      resolve();
    });

    // Run startup initialization
    return this.waitForStartedState;
  }

  /**
   * Stop the application - safe to be called multiple times to ensure STOPPED state
   *
   * @returns {Promise<void>}
   */
  public async stop(): Promise<void> {
    // Check if we should short circuit early
    if (this.state === Komapi.LifecycleState.STOPPED) return;
    if (this.state === Komapi.LifecycleState.STARTING)
      throw new Error('Cannot stop application while in `STARTING` state');
    else if (this.state === Komapi.LifecycleState.STOPPING) return this.waitForStartedState;

    // Set STOPPING state
    this.state = Komapi.LifecycleState.STOPPING;
    return new Promise(async resolve => {
      // Call lifecycle handlers
      for (const handler of this.stopHandlers) {
        await handler(this);
      }

      // Set new STOPPED state
      this.state = Komapi.LifecycleState.STOPPED;
      resolve();
    });
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

// Exports
export = Komapi;
