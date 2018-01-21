// Dependencies
import Koa from 'koa';
import bunyan from 'bunyan';
import { notImplemented, methodNotAllowed, notFound } from 'boom';
import mount from 'koa-mount';
import compose from 'koa-compose';
import uuid from 'uuid';
import { findIndex, forOwn, mapValues } from 'lodash';
import Router from 'koa-router';
import cluster from 'cluster';
import validateConfig from './lib/config';
import Schema from './modules/json-schema/Schema';
import context from './lib/context';
import request from './lib/request';
import sanitize from './lib/sanitize';

// Middlewares
import responseDecorator from './middleware/responseDecorator';
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import ensureSchema from './middleware/ensureSchema';
import notFoundHandler from './middleware/notFoundHandler';

// Init
const configSchema = Joi => Joi.object({
  env: Joi.any().valid(['development', 'production']).default('development'),
  loggers: Joi.array().items(Joi.object({
    name: Joi.string(),
  }).unknown()).default([]),
  name: Joi.string().min(1).default('Komapi application'),
  proxy: Joi.boolean().default(false),
  routePrefix: Joi.string().min(1).default('/'),
  subdomainOffset: Joi.number().min(0).default(2),
});

// Define middleware function signature
/**
 * @callback KoaCompatibleMiddleware
 * @param {Context} ctx - Koa context
 * @param {function=} next - Koa next function
 * @returns {*}
 */

/**
 * @extends Koa
 */
export default class Komapi extends Koa {
  /**
   * Create a Komapi instance
   *
   * @param {Object=} config - Komapi configuration parameters
   * @param {Object=} userConfig - User configuration to be available under app.locals
   */
  constructor(config = {}, userConfig = {}) {
    super();

    // Set properties
    this.locals = userConfig;
    this.orm = {};
    this.state = {};
    this.config = validateConfig(Object.assign({ env: process.env.NODE_ENV }, config), configSchema);
    this.service = {};
    this.schema = new Schema({
      useDefaults: true,
      coerceTypes: true,
    });

    // Housekeeping
    process.env.NODE_ENV = this.config.env;

    // Integrate with Koa
    [
      'env',
      'subdomainOffset',
      'proxy',
      'name',
    ].forEach((key) => {
      delete this[key];
      Object.defineProperty(this, key, {
        get: () => this.config[key],
        set: (v) => { this.config[key] = v; },
      });
    });

    // Add default functionality
    this.log = bunyan.createLogger({
      name: this.name,
      streams: this.config.loggers,
      serializers: {
        err: bunyan.stdSerializers.err,
        request: function requestSerializer(req) {
          return ({
            user: req.auth,
            body: (req.ctx.response.status >= 500) ? sanitize(req.body) : undefined,
            headers: Object.assign({}, req.header, {
              authorization: req.header.authorization ? `${req.header.authorization.split(' ')[0]} ****` : undefined,
            }),
            method: req.method,
            protocol: req.protocol,
            url: req.url,
            query: req.query,
            ip: req.ip,
            referrer: req.header.referer || req.header.referrer,
            userAgent: req.header['user-agent'],
            httpVersion: req.httpVersion,
            trailers: req.trailers,
            version: req.req.version,
            clientClosed: req.req.clientClosed,
          });
        },
        response: function responseSerializer(res) {
          return ({
            status: res.status,
            headers: res.headers,
            length: res.length,
            type: res.type,
            body: (res.status >= 500 && parseInt(res.length, 10) <= 1024) ? res.body : undefined,
          });
        },
      },
    });

    // Log errors
    this.on('error', (err, ctx) => {
      if (ctx) {
        ctx.log.error({
          latency: Math.floor((Date.now() - ctx.request.startAt) / 1000),
          request: ctx.request,
          response: ctx.response,
          err,
          context: 'request',
        }, 'Application Request Error');
      } else {
        this.log.error({
          err,
          context: 'application',
        }, 'Application Error');
      }
    });

    // Should fail fast on unhandled exceptions and rejections - and log them
    process.on('uncaughtException', (err) => {
      this.log.fatal({
        err,
        context: 'application',
      }, 'Uncaught Exception Error');
      process.exit(1);
    });
    process.on('unhandledRejection', (err, p) => {
      this.log.fatal({
        err,
        promise: p,
        context: 'application',
      }, 'Unhandled Rejected Promise');
      process.exit(1);
    });

    // Set up mandatory middleware
    this.use(responseDecorator());
    this.use(errorHandler());

    // Create prototype helpers for the native koa objects
    this.context = context(this.context, this);
    this.request = request(this.request, this);
  }

  // Helper middlewares
  get mw() { // eslint-disable-line class-methods-use-this
    return {
      ensureSchema,
      requestLogger,
      notFound: notFoundHandler,
    };
  }

  // Configuration
  route(...middlewares) {
    const path = typeof middlewares[0] === 'string' ? middlewares.shift() : '/';
    const router = new Router();
    router.use('', ...middlewares);
    const fn = compose([router.routes(), router.allowedMethods({
      throw: true,
      notImplemented,
      methodNotAllowed,
    })]);
    Object.defineProperty(fn, 'name', {
      value: `komapiRouter::${path}`,
    });
    return this.use(path, fn);
  }

  /**
   * This function is called when a query error occurs. It is advisable to log the error in this function.
   *
   * @callback ORMQueryErrorLogger
   * @param {Error} err - Error object
   * @param {Object} queryContext - ORM Context
   */
  /**
   * This function is called when a query does not return any rows and was initiated with `.throwIfNotFound()`
   *
   * @callback ORMCreateNotFoundError
   * @param {Object} queryContext - ORM Context
   */

  /**
   * Load an array of Objection.js models
   *
   * @param {Object.<string, Model>} models - Objection.js models
   * @param {Object=} opts - Options object
   * @param {ORMQueryErrorLogger=} opts.errorLogger - Function to handle any query errors - likely logging
   * @param {ORMCreateNotFoundError=} opts.createNotFoundError - Function to throw not found error when query is run with `.throwIfNotFound()`
   * @returns {Komapi}
   */
  models(models, opts = {}) {
    const config = Object.assign({
      errorLogger: (err, queryContext) => this.log.error({ err, orm: queryContext, context: 'orm' }, 'ORM Query Error'),
      createNotFoundError: queryContext => notFound(undefined, { queryContext }),
    }, opts);
    forOwn(models, (Model) => {
      if (config.errorLogger && !Model.knex().listeners('query-error').includes(config.errorLogger)) Model.knex().on('query-error', config.errorLogger);
      if (config.createNotFoundError) Model.createNotFoundError = config.createNotFoundError; // eslint-disable-line no-param-reassign
    });
    Object.assign(this.orm, models);
    return this;
  }

  /**
   * Load an array of services that should be instantiated with an app instance
   *
   * @param {Object.<string, Service>} Services - Classes to be available as instances under app.service (or the optional key)
   * @param {Object=} opts - Options object
   * @param {string=} opts.key - Which key should we assign the services to? Defaults to "service"
   * @returns {Komapi}
   */
  services(Services, opts = {}) {
    const config = Object.assign({ key: 'service' }, opts);
    if (!this[config.key]) this[config.key] = {};
    Object.assign(this[config.key], mapValues(Services, Service => new Service(this)));
    return this;
  }

  // Private overrides of Koa's methods
  use(mountAt, ...middlewares) {
    const mountAtPath = (typeof mountAt !== 'string') ? '/' : mountAt;
    let fn = middlewares;
    if (typeof mountAt === 'function') fn.unshift(mountAt);
    if (fn.length > 1) {
      const name = `[${fn.map(f => f.name).join(', ')}]`;
      fn = compose(fn);
      Object.defineProperty(fn, 'name', {
        value: name,
      });
    } else fn = fn.pop();
    if (mountAtPath !== '/') {
      const { name } = fn;
      fn = mount(mountAtPath, fn);
      Object.defineProperty(fn, 'name', {
        value: name,
      });
    }
    if (this.config.routePrefix !== '/') fn = mount(this.config.routePrefix, fn);
    this.log.debug({
      mountedAt: mountAtPath,
      middleware: fn.name || '(anonymous)',
      context: 'middleware',
    }, 'Registering middleware');
    super.use(fn);

    // Check if we should move it - done this way to leverage default checks on middleware
    if (fn.registerBefore) {
      const addBeforeIndex = findIndex(this.middleware, mw => mw.name === fn.registerBefore);
      if (addBeforeIndex > -1) {
        this.middleware.pop();
        this.middleware.splice(addBeforeIndex, 0, fn);
      }
    }

    return this;
  }

  /**
   * @override
   */
  createContext(req, res) {
    const ctx = super.createContext(req, res);
    ctx.send = ctx.send.bind(ctx);
    ctx.sendIf = ctx.sendIf.bind(ctx);
    ctx.apiResponse = ctx.apiResponse.bind(ctx);
    ctx.apiResponseIf = ctx.apiResponseIf.bind(ctx);
    ctx.request.startAt = Date.now();
    ctx.request.reqId = (this.config.proxy && ctx.request.headers['x-request-id'])
      ? ctx.request.headers['x-request-id']
      : uuid.v4();

    ctx.log = this.log.child({
      req_id: ctx.request.reqId,
      context: 'request',
    }, true);

    // This is used by some templating packages through koa-views
    ctx.state.cache = (this.env !== 'development');

    return ctx;
  }

  /**
   * Simple json representation of the application
   *
   * @returns {Object}
   */
  toJSON() {
    return {
      config: this.config,
      state: this.state,
    };
  }

  /**
   * Start application using the built-in listen function in Koa
   *
   * @returns {Server}
   */
  listen(...args) {
    // Perform health check
    this.healthCheck();

    // Start Koa
    const server = super.listen(...args);
    const isCluster = cluster.isWorker;
    const address = server.address();

    // Ignored as this is difficult to replicate through ava
    /* istanbul ignore if */
    if (!address) {
      this.log.error({
        context: 'application',
        env: this.env,
        isCluster,
        address,
      }, `${this.name} failed to bind listener ${isCluster ? 'as fork in' : 'in'} ${this.env} mode`);
      return server;
    }

    // Acquire listening details
    const bindType = typeof address === 'string' ? 'pipe' : 'port';
    const bind = bindType === 'port' ? address.port : address;

    // Log
    this.log.info({
      context: 'application',
      env: this.env,
      isCluster,
      address,
      bindType: !isCluster ? bindType : 'fork',
      port: bindType === 'port' ? bind : null,
      family: address.family,
    }, `${this.name} started ${isCluster ? 'as fork in' : 'in'} ${this.env} mode ${!isCluster ? `and listening on ${bindType} ${bind}` : ''}`);

    // Return server
    return server;
  }

  /**
   * Perform various health checks
   */
  healthCheck() {
    // Check unsupported amount of middlewares
    if (this.middleware.length > 4000) {
      this.log.warn({
        context: 'application',
      }, `Komapi was started with ${this.middleware.length} middlewares. Please note that more than 4000 middlewares is not supported and could cause stability and performance issues.`); // eslint-disable-line max-len
    }
  }
}
