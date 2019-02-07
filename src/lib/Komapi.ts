// Imports
import Koa from 'koa';
import os from 'os';
import stream from 'stream';
import defaultsDeep from 'lodash.defaultsdeep';
import Pino from 'pino';
import cls from 'cls-hooked';
import delegate from 'delegates';
import createLogger from './createLogger';
import Service from './Service';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';
import setTransactionContext from '../middlewares/setTransactionContext';

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
  public log: Pino.Logger;

  /**
   * Create new Komapi instance
   *
   * @param {DeepPartial<Komapi.Options>=} options
   */
  constructor(options?: DeepPartial<Komapi.Options>) {
    super();

    // Create default options
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
      logStream: Pino.destination(),
    });

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
        log: this.log,
      });
      // Object.assign(this.response, {
      //   send: function send<T>(body: T): ReturnType<Koa.Response['send']> {
      //     this.body = body;
      //     return this.body;
      //   },
      //   sendAPI: function sendAPI<T, U>(body: T, metadata?: U): ReturnType<Koa.Response['sendAPI']> {
      //     this.body = { metadata, data: body };
      //     return this.body;
      //   },
      // } as Koa.Response);
      delegate<Koa.BaseContext, Koa.Request>(this.context, 'request')
        .access('startAt')
        .access('requestId')
        .access('log');
      // delegate<Koa.BaseContext, Koa.Response>(this.context, 'response')
      //   .access('send')
      //   .access('sendAPI');
    }
    /**
     * Wire it all up
     */
    {
      // Add middlewares
      this.use(setTransactionContext(this.transactionContext));
    }
  }

  /**
   * Run a function with transaction context
   *
   * @param {() => any} func
   */
  public async run<ReturnValue = any>(func: () => any): Promise<ReturnValue> {
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
  public use<NewCustomStateT = {}, NewCustomContextT = {}, NewCustomServicesT extends Komapi.Services = {}>(
    middleware: Komapi.Middleware<
      CustomStateT & NewCustomStateT,
      CustomContextT & NewCustomContextT,
      CustomServicesT & NewCustomServicesT
    >,
  ): Komapi<CustomStateT & NewCustomStateT, CustomContextT & NewCustomContextT, CustomServicesT & NewCustomServicesT> {
    return super.use<NewCustomStateT, NewCustomContextT>(middleware as Koa.Middleware<
      NewCustomStateT,
      NewCustomContextT
    >) as Komapi<
      CustomStateT & NewCustomStateT,
      CustomContextT & NewCustomContextT,
      CustomServicesT & NewCustomServicesT
    >;
  }
}

/**
 * Namespace
 */
declare namespace Komapi {
  // User customizable types
  export interface Services {
    [name: string]: ConstructableService<Service>;
  }

  // Komapi native types
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
    log: Komapi['log'];
    startAt: number;
  }
  export interface BaseResponse {
    requestId: string;
    log: Komapi['log'];
    startAt: number;
  }
  export interface BaseContext {
    log: BaseRequest['log'];
    requestId: BaseRequest['requestId'];
    // send: Response['send'];
    // sendAPI: Response['sendAPI'];
    startAt: BaseRequest['startAt'];
  }
  export interface Request {}
  export interface Response {}
  export interface Context {}
}

// Exports
export = Komapi;
