// Imports
import stream from 'stream';
import os from 'os';
import Koa from 'koa';
import Pino from 'pino';
import defaultsDeep from 'lodash.defaultsdeep';
import delegate from 'delegates';
import cls from 'cls-hooked';
import http from 'http';
import uuidv4 from 'uuid';
import Router from 'koa-router';
import compose from 'koa-compose';
import createLogger from './createLogger';
import setTransactionContext from '../middlewares/setTransactionContext';
import ensureReady from '../middlewares/ensureReady';
import requestLogger from '../middlewares/requestLogger';
import errorHandler from '../middlewares/errorHandler';
import ensureSchema from '../middlewares/ensureSchema';
import healthReporter from '../middlewares/healthReporter';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';
import Schema from './Schema';
import ensureModel from './ensureModel';
import BaseService from './Service';
import Signals = NodeJS.Signals;

const pkg = require('../../package.json'); // tslint:disable-line no-var-requires

/**
 * Overload Koa by extending Komapi for simple module augmentation
 */
declare module 'koa' {
  interface Application extends Komapi {}
  interface BaseRequest extends Komapi.BaseRequest {}
  interface Request extends Komapi.Request {}
  interface BaseResponse extends Komapi.BaseResponse {}
  interface Response extends Komapi.Response {}
  interface BaseContext extends Komapi.BaseContext {}
  interface Context extends Komapi.Context {}
}

/**
 * Types
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer SU>
    ? ReadonlyArray<DeepPartial<SU>>
    : DeepPartial<T[P]>
};

/**
 * Komapi class
 */
declare interface Komapi extends Komapi.Application {}
class Komapi extends Koa {
  /**
   * Export helper functions by attaching to Komapi (hack to make it work with named import and module augmentation)
   */
  public static Service = BaseService;
  public static Schema = Schema;
  public static ensureSchema = ensureSchema;
  public static ensureModel = ensureModel;
  public static requestLogger = requestLogger;
  public static errorHandler = errorHandler;
  public static healthReporter = healthReporter;

  /**
   * Setup Komapi properties
   */
  public readonly config: Komapi.Options['config'];
  public readonly transactionContext: cls.Namespace;
  public readonly services: Komapi.InstantiatedServices;
  public locals: Komapi.Locals = {};
  public log: Pino.Logger;
  public state: Komapi.Lifecycle = Komapi.Lifecycle.SETUP;
  public readonly waitForReadyState: Promise<Komapi.Lifecycle.READY> = new Promise(
    resolve => (this._setReadyState = resolve),
  );
  protected initHandlers: Komapi.LifecycleHandler[] = [];
  protected closeHandlers: Komapi.LifecycleHandler[] = [];
  private _setReadyState!: () => void;

  /**
   * Create new Komapi instance
   *
   * @param {DeepPartial<Komapi.Options>} options
   */
  constructor(options: DeepPartial<Komapi.Options> = {}) {
    super();

    // Create default options
    const opts = defaultsDeep({}, options, {
      config: {
        env: this.env,
        proxy: this.proxy,
        silent: this.silent,
        keys: this.keys,
        subdomainOffset: this.subdomainOffset,
        instanceId: pkg.name,
        errorHandler: errorHandler(),
        requestLogger: requestLogger(),
        healthReporter: healthReporter('/.well_known/_health'),
      },
      services: {},
      locals: {},
      logOptions: {
        useLevelLabels: true,
        level: process.env.LOG_LEVEL || 'info',
        base: {
          pid: process.pid,
          hostname: os.hostname(),
          env: this.env,
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
      logStream: (Pino as any).destination(),
    });

    /**
     * Initialization
     */
    {
      // Create namespace
      this.transactionContext = cls.createNamespace(opts.config.instanceId);

      // Set config
      this.config = opts.config;
      this.locals = opts.locals;
      this.log = createLogger(this.transactionContext, opts.logOptions, opts.logStream);
      this.services = Object.entries(opts.services).reduce(
        (acc, [k, v]: [string, any]) => {
          acc[k] = new v(this);
          return acc;
        },
        {} as any,
      );
    }

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
      Object.assign(this.context, {
        auth: {},
        services: this.services,
      });
      Object.assign(this.request, {
        requestId: null,
        log: this.log,
      });
      Object.assign(this.response, {
        send: function send<T>(body: T): ReturnType<Koa.Response['send']> {
          this.body = body;
          return this.body;
        },
        sendAPI: function sendAPI<T, U>(body: T, metadata?: U): ReturnType<Koa.Response['sendAPI']> {
          this.body = { metadata, data: body };
          return this.body;
        },
      } as Koa.Response);
      delegate<Koa.BaseContext, Koa.Request>(this.context, 'request')
        .access('startAt')
        .access('requestId')
        .access('log');
      delegate<Koa.BaseContext, Koa.Response>(this.context, 'response')
        .access('send')
        .access('sendAPI');
    }

    /**
     * Set up event handlers
     */
    {
      // Log emitted errors
      this.on('error', (err, ctx) => {
        (ctx || this).log.error({ err, app: this }, 'Application Error Event');
      });

      // Graceful shutdown
      (['SIGTERM', 'SIGINT', 'SIGHUP'] as Signals[]).forEach((signal: Signals) =>
        process.once(signal, async () => {
          try {
            // @ts-ignore
            this.log = Pino.final(this.log);
            await this.close();
            process.exit(0);
          } catch (err) {
            this.log.fatal(
              { err, app: this, metadata: { signal } },
              `Failed to handle \`${signal}\` gracefully. Exiting with status code 1`,
            );
            process.exit(1);
          }
        }),
      );

      // Handle application state inconsistencies
      process.once('uncaughtException', async err => {
        // @ts-ignore
        this.log = Pino.final(this.log);
        this.log.fatal({ err, app: this }, 'Uncaught Exception Error - Stopping application to prevent instability');
        await this.close();
        process.exit(1);
      });
      process.once('unhandledRejection', async (err, promise) => {
        // @ts-ignore
        this.log = Pino.final(this.log);
        this.log.fatal(
          { err, app: this, metadata: { promise } },
          'Unhandled Rejected Promise - Stopping application to prevent instability',
        );
        await this.close();
        process.exit(1);
      });
      process.once('multipleResolves', async (type, promise, value) => {
        // @ts-ignore
        this.log = Pino.final(this.log);
        this.log.fatal(
          { app: this, metadata: { type, promise, value } },
          'Promise resolved or rejected more than once - Stopping application to prevent instability',
        );
        await this.close();
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
        this.log.debug({ app: this }, 'Before exit event triggered - ensuring graceful shutdown');
        if (this.state !== Komapi.Lifecycle.CLOSING && this.state !== Komapi.Lifecycle.CLOSED) await this.close();
      });
    }

    /**
     * Wire it all up
     */
    {
      // Add service handlers
      Object.entries(this.services).forEach(([name, service]) => {
        const serviceInitializer: Komapi.LifecycleHandler = async (...args) => service.init(...args);
        const serviceCloser: Komapi.LifecycleHandler = async (...args) => service.close(...args);
        Object.defineProperty(serviceInitializer, 'name', { value: `service:${name}.init` });
        Object.defineProperty(serviceCloser, 'name', { value: `service:${name}.close` });
        this.onInit(serviceInitializer);
        this.onClose(serviceCloser);
      });

      // Add middlewares
      this.use(setTransactionContext(this.transactionContext));
      if (this.config.requestLogger) this.use(this.config.requestLogger);
      if (this.config.errorHandler) this.use(this.config.errorHandler);
      if (this.config.healthReporter) this.use(this.config.healthReporter);
      this.use(ensureReady());
    }
  }

  /**
   * Add init handlers before services - e.g. connect to database
   *
   * @returns {Promise<this>}
   */
  public onBeforeInit(...handlers: Komapi.LifecycleHandler[]): this {
    if (this.state !== Komapi.Lifecycle.SETUP) {
      throw new Error(`Cannot add init lifecycle handlers when application is in \`${this.state}\` state`);
    }
    handlers
      .slice(0)
      .reverse()
      .forEach(handler => this.initHandlers.unshift(handler));
    return this;
  }

  /**
   * Add init handlers after services - e.g. pre-warm cache
   *
   * @returns {Promise<this>}
   */
  public onInit(...handlers: Komapi.LifecycleHandler[]): this {
    if (this.state !== Komapi.Lifecycle.SETUP) {
      throw new Error(`Cannot add init lifecycle handlers when application is in \`${this.state}\` state`);
    }
    handlers.forEach(handler => this.initHandlers.push(handler));
    return this;
  }

  /**
   * Add close handlers before services - e.g. close connections
   *
   * @returns {Promise<this>}
   */
  public onClose(...handlers: Komapi.LifecycleHandler[]): this {
    if (this.state === Komapi.Lifecycle.CLOSING || this.state === Komapi.Lifecycle.CLOSED) {
      throw new Error(`Cannot add close lifecycle handlers when application is in \`${this.state}\` state`);
    }
    handlers
      .slice(0)
      .reverse()
      .forEach(handler => this.closeHandlers.unshift(handler));
    return this;
  }

  /**
   * Add close handlers after services close - e.g. clean up temp files
   *
   * @returns {Promise<this>}
   */
  public onAfterClose(...handlers: Komapi.LifecycleHandler[]): this {
    if (this.state === Komapi.Lifecycle.CLOSING || this.state === Komapi.Lifecycle.CLOSED) {
      throw new Error(`Cannot add close lifecycle handlers when application is in \`${this.state}\` state`);
    }
    handlers.forEach(handler => this.closeHandlers.push(handler));
    return this;
  }

  /**
   * Set state of application
   *
   * @returns {Promise<this>}
   */
  public setState(newState: Komapi.Lifecycle): this {
    const prevState = this.state;
    switch (newState) {
      case Komapi.Lifecycle.READYING:
        if (this.state !== Komapi.Lifecycle.SETUP) {
          throw new Error(`Cannot change state from \`${this.state}\` => \`${Komapi.Lifecycle.READYING}\``);
        }
        this.state = Komapi.Lifecycle.READYING;
        break;
      case Komapi.Lifecycle.READY:
        if (this.state !== Komapi.Lifecycle.READYING) {
          throw new Error(`Cannot change state from \`${this.state}\` => \`${Komapi.Lifecycle.READY}\``);
        }
        this.state = Komapi.Lifecycle.READY;

        // Resolve ready promise
        this._setReadyState();
        break;
      case Komapi.Lifecycle.CLOSING:
        if (this.state === Komapi.Lifecycle.CLOSING || this.state === Komapi.Lifecycle.CLOSED) {
          throw new Error(`Cannot change state from \`${this.state}\` => \`${Komapi.Lifecycle.CLOSING}\``);
        }
        this.state = Komapi.Lifecycle.CLOSING;
        break;
      case Komapi.Lifecycle.CLOSED:
        if (this.state !== Komapi.Lifecycle.CLOSING) {
          throw new Error(`Cannot change state from \`${this.state}\` => \`${Komapi.Lifecycle.CLOSED}\``);
        }
        this.state = Komapi.Lifecycle.CLOSED;
        break;
      default:
        throw new Error(`Cannot set state to unknown state \`${newState}\``);
    }
    // Emit new state?
    this.log.debug(
      { metadata: { prevState, newState } },
      `Application state changed from \`${prevState}\` to \`${newState}\``,
    );
    return this;
  }

  /**
   * Initiate asynchronous init actions (e.g. services) one-by-one
   *
   * @returns {Promise<this>}
   */
  public async init(): Promise<this> {
    this.setState(Komapi.Lifecycle.READYING);
    for (const handler of this.initHandlers) {
      const startDate = Date.now();
      await handler(this);
      this.log.trace(
        { metadata: { name: handler.name || 'UNKNOWN', duration: Date.now() - startDate } },
        'Init lifecycle handler called',
      );
    }
    this.setState(Komapi.Lifecycle.READY);
    return this;
  }

  /**
   * Close asynchronous init actions (e.g. services) one-by-one
   * @returns {Promise<this>}
   */
  public async close(): Promise<this> {
    this.setState(Komapi.Lifecycle.CLOSING);
    for (const handler of this.closeHandlers) {
      const startDate = Date.now();
      await handler(this);
      this.log.trace(
        { metadata: { name: handler.name || 'UNKNOWN', duration: Date.now() - startDate } },
        'Close lifecycle handler called',
      );
    }
    this.setState(Komapi.Lifecycle.CLOSED);
    return this;
  }

  /**
   * Create a unique request id. This is used to set ctx.requestId in the createContext method.
   *
   * The following logic is used to generate a request id:
   * 1. Use ctx.requestId if set
   * 2. If app.proxy is true, use "x-request-id" request header (ctx.request.headers['x-request-id']) if set
   * 3. Generate a unique uuid v4
   *
   * @param {Koa.Context} ctx - The request context
   * @returns {string}
   */
  public createRequestId(ctx: Koa.Context): string {
    return (this.proxy && ctx.request.get('x-request-id')) || uuidv4();
  }

  /**
   * @override
   */
  public createContext(req: http.IncomingMessage, res: http.ServerResponse) {
    const ctx = super.createContext(req, res);
    const requestId = this.createRequestId(ctx);

    // Update request
    Object.assign(ctx.request, {
      requestId,
      startAt: Date.now(),
    });

    // Integrate with passport
    (ctx.auth as any).__defineGetter__('user', () => {
      const maybePassport = ctx as Koa.Context & {
        state: {
          _passport?: {
            instance?: {
              _userProperty: string;
            };
          };
        };
        request: {
          _passport?: {
            instance?: {
              _userProperty: string;
            };
          };
        };
      };
      if (maybePassport.request._passport && maybePassport.request._passport.instance) {
        return ctx.state[maybePassport.request._passport.instance._userProperty];
      }
      if (maybePassport.state._passport && maybePassport.state._passport.instance) {
        return ctx.state[maybePassport.state._passport.instance._userProperty];
      }
      return null;
    });
    (ctx.auth as any).__defineGetter__('info', () => ctx.authInfo || {});

    // Update response
    Object.assign(ctx.response, {
      send: ctx.response.send.bind(ctx.response),
      sendAPI: ctx.response.sendAPI.bind(ctx.response),
    });

    return ctx;
  }

  /**
   * @override
   */
  public use(path: string | string[] | RegExp, ...middlewares: Komapi.Middleware[]): this;
  public use(...middlewares: Komapi.Middleware[]): this;
  public use(...middlewares: [string | string[] | RegExp | Komapi.Middleware, ...Komapi.Middleware[]]): this {
    const [routePath, ...rest] = middlewares;
    let mw: Komapi.Middleware;

    if (middlewares.length === 0) throw new Error('No middlewares provided to `app.use()`');
    else if (typeof routePath === 'string' || Array.isArray(routePath) || routePath instanceof RegExp) {
      if (rest.length === 0) throw new Error('No middlewares provided to `app.use()`');
      const router = new Router();
      router.use(routePath, ...rest);
      mw = router.routes();
      this.log.debug(
        { metadata: { path: routePath, middlewares: rest.map(v => v.name || 'UNKNOWN') } },
        'Added middlewares',
      );
    } else {
      const mwList = [routePath, ...rest];
      if (mwList.length > 1) {
        mw = compose(mwList);
        Object.defineProperty(mw, 'name', { value: `composed(${mwList.map(v => v.name || 'UNKNOWN').join(',')})` });
      } else {
        mw = mwList[0];
      }
      this.log.debug({ metadata: { middlewares: mwList.map(v => v.name || 'UNKNOWN') } }, 'Added middlewares');
    }
    return super.use(mw);
  }

  /**
   * @override
   */
  public listen(...args: any[]): ReturnType<Koa['listen']> {
    const server = super.listen(...args);

    // TODO: Ensure that connections are cleared up within a reasonable time (track sockets and forcefully close them)
    // tslint:disable-next-line ter-prefer-arrow-callback
    this.onClose(function closeHttpServer() {
      return new Promise(resolve => server.close(resolve));
    });
    return server;
  }
}

/**
 * Namespace
 */
declare namespace Komapi {
  export type Middleware = Koa.Middleware;
  export type LifecycleHandler = (app: Komapi) => Promise<any>;
  export const enum Lifecycle {
    SETUP = 'SETUP',
    READYING = 'READYING',
    READY = 'READY',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
  }
  export interface Application {}
  export interface Options {
    config: {
      env: Koa['env'];
      proxy: Koa['proxy'];
      subdomainOffset: Koa['subdomainOffset'];
      silent: Koa['silent'];
      keys: Koa['keys'];
      instanceId: string;
      errorHandler: Komapi.Middleware | false | null;
      requestLogger: Komapi.Middleware | false | null;
      healthReporter: Komapi.Middleware | false | null;
      locals: Locals;
    };
    services: Services;
    locals: Options['config']['locals'];
    logOptions: Pino.LoggerOptions;
    logStream: stream.Writable | stream.Duplex | stream.Transform;
  }
  export type InstantiatedServices = { [P in keyof Services]: InstanceType<Services[P]> };
  export type ConstructableService<T extends Service> = new (...args: any[]) => T;

  // User customizable types
  export interface Services {
    [name: string]: ConstructableService<Service>;
  }
  export interface Locals {}
  export interface Authentication {
    user: {} | null;
    info: {};
  }
  export interface Service extends BaseService {}

  // Generic types
  export interface APIResponse<T, U> {
    metadata?: U;
    data: T;
  }

  // Available Koa overloads
  export interface BaseRequest {}
  export interface Request {
    requestId: string;
    log: Komapi['log'];
    startAt: number;
  }
  export interface BaseResponse {}
  export interface Response {
    send: <T extends Koa.Response['body'] = Koa.Response['body']>(body: T) => T;
    sendAPI: <T extends Koa.Response['body'] = Koa.Response['body'], U extends object | undefined = undefined>(
      body: T,
      metadata?: U,
    ) => APIResponse<T, U>;
  }
  export interface BaseContext {
    auth: Authentication;
    services: Komapi['services'];
  }
  export interface Context {
    authInfo?: {};
    log: Request['log'];
    requestId: Request['requestId'];
    send: Response['send'];
    sendAPI: Response['sendAPI'];
    startAt: Request['startAt'];
  }
}

// Exports
export = Komapi;
