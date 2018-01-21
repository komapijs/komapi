// Dependencies
import Koa from 'koa';
import { IncomingMessage, ServerResponse } from 'http';
import { defaultsDeep, pick } from 'lodash';
import Pino from 'pino';
import stream from 'stream';
import uuidv4 from 'uuid/v4';
import serializeRequest from './serializeRequest';
import serializeResponse from './serializeResponse';

// Types
declare module 'koa' {
  // tslint:disable-next-line interface-name
  interface Context {
    reqId: string;
    startAt: Date;
    sendResponse: <T extends Koa.Response['body']>(body: T, shouldSend?: boolean) => T | void;
  }
}
interface IApplicationConfig {
  name: string;
  env: string;
  subdomainOffset: number;
  proxy: boolean;
  logOptions: Pino.LoggerOptions;
  logStream: stream.Writable | stream.Duplex | stream.Transform;
  instanceId: string;
}
interface IState<T, U> {
  cache: boolean;
  locals: T;
  secrets: U;
}
interface IJSON<T, U> {
  config: Pick<IApplicationConfig, 'name' | 'env' | 'subdomainOffset' | 'proxy' | 'instanceId'>;
  state: Pick<IState<T, U>, Exclude<keyof IState<T, U>, 'secrets'>> | { secrets: {} };
}

// Init
const defaultApplicationConfig: IApplicationConfig = {
  name: 'Komapi application',
  env: 'development',
  subdomainOffset: 2,
  proxy: false,
  logOptions: {
    level: 'info',
    serializers: {
      request: serializeRequest,
      response: serializeResponse,
      err: Pino.stdSerializers.err,
    },
  },
  logStream: process.stdout,
  instanceId: uuidv4(),
};

// Application
class Application<T, U> extends Koa {
  public readonly config: IApplicationConfig;
  public state: IState<T, U>;
  public log: Pino.Logger;

  /**
   * Create a new application
   *
   * @param {Partial<IApplicationConfig>} applicationConfig - Komapi application configuration (available through app.config)
   * @param {Object<T>} userConfig - Custom user provided data (available through app.state.locals)
   * @param {Object<U>} userSecrets - An object that is never included in logs. For sensitive information such as API keys (available through app.state.secrets).
   */
  constructor(applicationConfig?: Partial<IApplicationConfig>, userConfig: T = {} as T, userSecrets: U = {} as U) {
    super();

    // Set application configuration
    this.config = defaultsDeep({}, applicationConfig, { env: process.env.NODE_ENV }, defaultApplicationConfig);
    this.state = {
      secrets: userSecrets,
      cache: this.config.env === 'production', // Used by various template libraries
      locals: userConfig,
    };

    // Integrate with Koa
    Object.defineProperty(this, 'name', {
      get: () => this.config.name,
      set: v => {
        this.config.name = v;
      },
    });
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

    // Setup logging
    this.log = Pino(
      {
        ...this.config.logOptions,
        name: this.config.name,
      },
      this.config.logStream,
    ).child({
      instanceId: this.config.instanceId,
      env: this.config.env,
      context: 'application',
    });

    // Sanity check
    if (process.env.NODE_ENV !== this.config.env) {
      this.log.warn(
        { NODE_ENV: process.env.NODE_ENV },
        `NODE_ENV environment mismatch. Your application has been started with '{ env: '${
          this.config.env
        }' }' while 'process.env.NODE_ENV = ${
          process.env.NODE_ENV
        }'. It is recommended to start your application with '{ env: process.env.NODE_ENV }' and set the correct environment using the NODE_ENV environment variable.`,
      );
    }
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
   * @override
   * @returns {IJSON}
   */
  public toJSON(): IJSON<T, U> {
    return {
      config: pick(this.config, ['name', 'env', 'subdomainOffset', 'proxy', 'instanceId']),
      state: {
        ...this.state,
        secrets: '****',
      },
    };
  }

  /**
   * Create a unique request id. This is used to set ctx.reqId in the createContext method.
   *
   * The following logic is used to generate a request id:
   * 1. Use ctx.reqId if set
   * 2. If config.proxy is true, use "x-request-id" request header (ctx.request.headers['x-request-id']) if set
   * 3. Generate a unique uuid v4
   *
   * @param {Koa.Context} ctx - The request context
   * @returns {string}
   */
  public createRequestId(ctx: Koa.Context): string {
    return ctx.reqId || (this.config.proxy && ctx.request.headers['x-request-id']) || uuidv4();
  }

  /**
   * @override
   */
  public createContext(req: IncomingMessage, res: ServerResponse) {
    const ctx = super.createContext(req, res);
    ctx.startAt = new Date();
    ctx.reqId = this.createRequestId(ctx);
    ctx.log = this.log.child({
      context: 'request',
      requestId: ctx.reqId,
    });

    // Attach helper functions
    ctx.sendResponse = (body, shouldSend = true) => {
      if (shouldSend) {
        ctx.body = body;
        return ctx.body;
      }
      return;
    };

    return ctx;
  }
}

// Exports
export { IApplicationConfig, IState, IJSON, Koa };
export default Application;
