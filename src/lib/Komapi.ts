// Dependencies
import Koa from 'koa';
import http from 'http';
import os from 'os';
import stream from 'stream';
import Pino from 'pino';
import uuidv4 from 'uuid';
import delegate from 'delegates';
import { defaultsDeep } from 'lodash';
import Service from './Service';
import Schema from './Schema';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';

/**
 * Overload Koa to extend Komapi for simple module augmentation
 *
 * TODO: Might want to extend this further
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
declare namespace Komapi {
  export type Middleware = Koa.Middleware;

  export interface Application {}

  export interface Options {
    env: Koa['env'];
    proxy: Koa['proxy'];
    subdomainOffset: Koa['subdomainOffset'];
    services: { [P in keyof Services]: ConstructableService<Services[P]> };
    logOptions: Pino.LoggerOptions;
    logStream: stream.Writable | stream.Duplex | stream.Transform;

    [key: string]: any;
  }

  export interface ConstructableService<T extends Service> {
    new (...args: any[]): T;
  }

  export interface Services {}

  // Logging
  export interface SanitizedRequest
    extends Pick<Koa.Request, 'headers' | 'method' | 'protocol' | 'url' | 'query' | 'ip'> {
    requestId: string;
    body?: any;
    referrer: Koa.Request['header']['referer'] | Koa.Request['header']['referrer'];
    userAgent: Koa.Request['header']['user-agent'];
    httpVersion: Koa.Request['req']['httpVersion'];
    trailers: Koa.Request['req']['trailers'];
  }

  export interface SanitizedResponse extends Pick<Koa.Response, 'status' | 'headers' | 'length' | 'type'> {
    body?: string;
  }

  // Available Koa overloads
  export interface BaseRequest {}

  export interface Request {
    startAt: number;
    requestId: string;
    log: Komapi['log'];
  }

  export interface BaseResponse {}

  export interface Response {
    send: <T extends Koa.Response['body'] = Koa.Response['body']>(this: Koa.Context, body: T) => T;
  }

  export interface BaseContext {}

  export interface Context {
    startAt: Request['startAt'];
    requestId: Request['requestId'];
    log: Request['log'];
    send: Response['send'];
  }
}

/**
 * Init
 */
const defaultKomapiOptions: Pick<Komapi.Options, 'env' | 'subdomainOffset' | 'proxy' | 'services'> = {
  env: 'development',
  proxy: false,
  subdomainOffset: 2,
  services: {},
};
const defaultLogOptions: Komapi.Options['logOptions'] = {
  level: 'info',
  serializers: {
    request: serializeRequest(),
    response: serializeResponse(),
    err: Pino.stdSerializers.err,
  },
};

/**
 * Komapi class
 */
declare interface Komapi extends Komapi.Application {}
class Komapi extends Koa {
  // Instance properties
  public readonly config: Komapi.Options;
  public services: Komapi.Services;
  public log: Pino.Logger;
  public schema: Schema;

  /**
   * Create new application instance
   *
   * @param {Partial<Komapi.Options>} options
   */
  constructor(options: Partial<Komapi.Options> = {}) {
    super();

    /**
     * Init
     */
    // Set config
    this.config = defaultsDeep({}, options, { env: process.env.NODE_ENV }, defaultKomapiOptions);

    // Instantiate services
    this.services = Object.entries(options.services || {}).reduce(
      (acc, [k, v]: [string, any]) => {
        acc[k] = new v(this);
        return acc;
      },
      {} as any,
    ) as Komapi.Services;

    // Create logger
    this.log = Pino(
      defaultsDeep(
        {},
        options.logOptions,
        {
          level: process.env.LOG_LEVEL,
          base: {
            pid: process.pid,
            hostname: os.hostname(),
            env: this.env,
          },
        },
        defaultLogOptions,
      ),
      options.logStream || process.stdout,
    );

    // Create global schema handler
    this.schema = new Schema();

    /**
     * Integrate with Koa
     */
    Object.defineProperty(this, 'env', {
      get: () => this.config.env,
      set: v => {
        this.config.env = v;
      },
    });

    Object.defineProperty(this, 'subdomainOffset', {
      get: () => this.config.subdomainOffset,
      set: v => {
        this.config.subdomainOffset = v;
      },
    });

    Object.defineProperty(this, 'proxy', {
      get: () => this.config.proxy,
      set: v => {
        this.config.proxy = v;
      },
    });
    Object.assign(this.request, {
      requestId: undefined,
      log: this.log,
    });
    Object.assign(this.response, {
      send: function send<T extends Koa.Response['body']>(this: Koa.Context, body: T): T {
        this.body = body;
        return body;
      },
    });
    delegate<Koa.BaseContext, Koa.Request>(this.context, 'request')
      .access('startAt')
      .access('requestId')
      .access('log');
    delegate<Koa.BaseContext, Koa.Response>(this.context, 'response').access('send');

    /**
     * Sanity checks
     */
    if (process.env.NODE_ENV !== this.env) {
      this.log.warn(
        { NODE_ENV: process.env.NODE_ENV },
        `NODE_ENV environment mismatch. Your application has been instantiated with '{ env: '${
          this.env
        }' }' while 'process.env.NODE_ENV = ${
          process.env.NODE_ENV
        }'. It is recommended to start your application with '{ env: process.env.NODE_ENV }' and set the correct environment using the NODE_ENV environment variable.`,
      );
    }
  }

  /**
   * Initiate asynchronous init actions (e.g. services) one-by-one
   *
   * @returns {Promise<this>}
   */
  public async init(): Promise<this> {
    const services = Object.values(this.services);
    for (const service of services) {
      await service.init();
    }
    return this;
  }

  /**
   * Enable crash guard - this will shutdown the process if an unrecoverable error occurs, optionally calling the provided
   * callback for cleanup.
   *
   * @param {(err: Error, promise?: Promise<Error>) => void} userErrorHandler - Error handler if you need to clean up on fatal crash
   */
  public enableCrashGuard(userErrorHandler?: (err: Error, promise?: Promise<Error>) => void) {
    // Setup global error handling
    process.on('uncaughtException', err => {
      this.log.fatal({ err, app: this }, 'Uncaught Exception Error - Stopping application to prevent instability');
      if (userErrorHandler) Promise.resolve(userErrorHandler(err, undefined)).then(() => process.exit(1));
      else process.exit(1);
    });
    process.on('unhandledRejection', (err, p) => {
      this.log.fatal(
        { err, app: this, promise: p },
        'Unhandled Rejected Promise - Stopping application to prevent instability',
      );
      if (userErrorHandler) Promise.resolve(userErrorHandler(err, p)).then(() => process.exit(1));
      else process.exit(1);
    });
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
      log: ctx.request.log.child({ requestId }),
    });

    // Update response
    Object.assign(ctx.response, {
      send: ctx.response.send.bind(ctx.response),
    });

    return ctx;
  }
}

// Exports
export = Komapi;
