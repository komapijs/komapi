// Imports
import Koa from 'koa';
import os from 'os';
import stream from 'stream';
import { DeepPartial } from 'ts-essentials';
import defaultsDeep from 'lodash.defaultsdeep';
import Pino from 'pino';
import cls from 'cls-hooked';
import delegate from 'delegates';
import createLogger from './createLogger';
import Service from './Service';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';
import setTransactionContext from '../middlewares/setTransactionContext';
import { name } from '../../package.json';

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
class Komapi<CustomStateT = any, CustomContextT = {}> extends Koa<CustomStateT, CustomContextT> {
  /**
   * Export helper functions by attaching to Komapi (hack to make it work with named import and module augmentation)
   */
  public static Service = Service;

  /**
   * Public instance properties
   */
  public readonly config: Komapi.Options['config'];
  public readonly services: Komapi.InstantiatedServices;
  public readonly transactionContext: cls.Namespace;
  public log: Pino.Logger;

  /**
   * Create new Komapi instance
   *
   * @param {DeepPartial<Komapi.Options<CustomStateT, CustomContextT>>=} options
   */
  constructor(options?: DeepPartial<Komapi.Options<CustomStateT, CustomContextT>>) {
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
      logStream: (Pino as any).destination(),
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
      Object.assign(this.context, {
        services: this.services,
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
  export type Middleware<CustomStateT = any, CustomContextT = {}> = Koa.Middleware<CustomStateT, CustomContextT>;
  export type InstantiatedServices = { [P in keyof Services]: InstanceType<Services[P]> };
  export type ConstructableService<T extends Service> = new (...args: any[]) => T;
  export interface Options<CustomStateT = any, CustomContextT = {}> {
    config: {
      env: Koa['env'];
      proxy: Koa['proxy'];
      subdomainOffset: Koa['subdomainOffset'];
      silent: Koa['silent'];
      keys: Koa['keys'];
      instanceId: string;
      errorHandler: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
      requestLogger: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
      healthReporter: Komapi.Middleware<CustomStateT, CustomContextT> | false | null;
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
    services: Komapi['services'];
    startAt: BaseRequest['startAt'];
  }
  export interface Request {}
  export interface Response {}
  export interface Context {}
}

// Exports
export = Komapi;
