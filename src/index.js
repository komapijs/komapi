// Dependencies
import Koa from 'koa';
import bunyan from 'bunyan';
import { notImplemented as NotImplemented, methodNotAllowed as MethodNotAllowed } from 'boom';
import mount from 'koa-mount';
import compose from 'koa-compose';
import uuid from 'uuid';
import * as Objection from 'objection';
import Knex from 'knex';
import _ from 'lodash';
import loadModels from './lib/models';
import loadServices from './lib/services';
import validateConfig from './lib/config';
import Schema from './modules/json-schema/schema';
import context from './lib/context';
import request from './lib/request';

// Middlewares
import responseDecorator from './middleware/responseDecorator';
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import routes from './middleware/routeHandler';
import ensureSchema from './middleware/ensureSchema';

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

/**
 * @extends Koa
 */
export default class Komapi extends Koa {

  /**
   * Create a Komapi instance
   *
   * @param {Object=} config
   * @param {Object=} userConfig this is set directly to app.locals
   */
  constructor(config = {}, userConfig = {}) {
    super();

    // Set properties
    this.locals = userConfig;
    this.orm = undefined;
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
        set: v => (this.config[key] = v),
      });
    });

    // Add default functionality
    this.log = bunyan.createLogger({
      name: this.name,
      streams: this.config.loggers,
      serializers: {
        err: bunyan.stdSerializers.err,
        request: function requestSerializer(req) {
          function sanitize(dirty) {
            if (!dirty) return dirty;
            const clean = Object.assign({}, dirty);
            [
              'password',
              'creditCard',
              'credit-card',
            ].forEach((k) => {
              if (clean[k]) clean[k] = '*****';
            });
            return clean;
          }

          return ({
            user: req.auth,
            body: (req.ctx.response.status >= 500) ? sanitize(req.body) : undefined,
            headers: req.header,
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
  get mw() {
    const app = this;
    return {
      ensureSchema,
      requestLogger,
      route: function route(...middlewares) {
        const path = middlewares.pop();
        const router = routes(path, app, middlewares);
        const fn = compose([router.routes(), router.allowedMethods({
          throw: true,
          notImplemented: () => new NotImplemented('Not Implemented'),
          methodNotAllowed: () => new MethodNotAllowed('Method Not Allowed'),
        })]);
        Object.defineProperty(fn, 'name', {
          value: 'routeHandler',
        });
        return fn;
      },
    };
  }

  // Configuration
  models(path) {
    if (!this.orm) throw new Error('Use `app.objection()` before attempting to load models!');
    const models = loadModels(path, this);
    Object.assign(this.orm, models);
    return models;
  }

  objection(knex) {
    if (this.orm) throw new Error('Cannot initialize ORM more than once');
    this.orm = {
      $Model: Objection.Model,
      $transaction: Objection.transaction,
      $ValidationError: Objection.ValidationError,
    };
    this.orm.$Model.knex(typeof knex === 'object' ? Knex(knex) : knex);
    this.orm.$migrate = this.orm.$Model.knex().migrate;
    this.orm.$Model.knex().on('query-error', (err, obj) => {
      this.log.error({
        err,
        orm: obj,
        context: 'orm',
      }, 'ORM Query Error');
    });
  }

  services(path) {
    const services = loadServices(path, this);
    Object.assign(this.service, services);
    return services;
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
      const name = fn.name;
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
      const addBeforeIndex = _.findIndex(this.middleware, mw => mw.name === fn.registerBefore);
      if (addBeforeIndex > -1) {
        this.middleware.pop();
        this.middleware.splice(addBeforeIndex, 0, fn);
      }
    }

    return fn;
  }

  createContext(req, res) {
    const ctx = super.createContext(req, res);
    ctx.send = ctx.send.bind(ctx);
    ctx.sendIf = ctx.sendIf.bind(ctx);
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
   * @returns {object}
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
   * @param {Mixed} ...
   * @return {Server}
   */
  listen(...args) {
    // Perform health check - intentionally not returning the promise to not delay startup.
    this.healthCheck();

    // Start Koa
    const server = super.listen(...args);
    const address = server.address();
    const bindType = typeof address === 'string' ? 'pipe' : 'port';
    const bind = bindType === 'pipe' ? address : address.port;

    // Log
    this.log.info({
      context: 'application',
      env: this.env,
      address,
      bindType: bindType === 'port' ? 'port' : 'pipe',
      port: bindType === 'port' ? bind : null,
    }, `${this.name} started in ${this.env} mode and listening on ${bindType} ${bind}`);

    // Return server
    return server;
  }

  /**
   * Perform various health checks
   */
  async healthCheck() {
    // Check unsupported amount of middlewares
    if (this.middleware.length > 4000) {
      this.log.warn({
        context: 'application',
      }, `Komapi was started with ${this.middleware.length} middlewares. Please note that more than 4000 middlewares is not supported and could cause stability and performance issues.`); // eslint-disable-line max-len
    }
    // Check pending migrations
    if (this.orm && this.orm.$migrate) {
      const [allMigrations, completedMigrations] = await this.orm.$migrate._migrationData();
      if (_.difference(allMigrations, completedMigrations).length > 0) {
        this.log.warn({
          context: 'orm',
        }, 'There are pending migrations! Run `app.orm.$migrate.latest()` to run all pending migrations.');
      }
    }
  }
}
