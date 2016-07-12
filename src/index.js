'use strict';

// Dependencies
import Koa from 'koa';
import defaultConfig from './lib/config';
import Schema, {applySchema} from './lib/schema';
import context from './lib/context';
import request from './lib/request';
import response from './lib/response';
import bunyan from 'bunyan';
import Boom from 'boom';
import mount from 'koa-mount';
import compose from 'koa-compose';
import uuid from 'node-uuid';
import Knex from 'knex';
import * as Objection from 'objection';
import _ from 'lodash';
import models from './lib/models';

// Middlewares
import responseDecorator from './middleware/responseDecorator';
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import routes from './middleware/routeHandler';
import headers from './middleware/headers';
import KomapiPassport from './modules/passport';
import serve from 'koa-static';
import views from 'koa-views';
import compress from 'koa-compress';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';
import cors from 'kcors';
import bodyParser from 'koa-bodyparser';

// Objection plugins
import objectionSoftDelete from './lib/objectionPlugins/softDelete';
import objectionRestify from './lib/objectionPlugins/restify';
import objectionTimestamps from './lib/objectionPlugins/timestamps';

// Export
export default class Komapi extends Koa{

    /**
     * Create a Kompai instance
     *
     * @param config
     */
    constructor (config = {}) {
        super();

        // Set properties
        this.orm = undefined;
        this.state = {};
        this.config = Object.assign({}, defaultConfig(config.env || process.env.NODE_ENV), config);
        this.passport = new KomapiPassport;
        this.schema = new Schema();

        // Validate config
        applySchema('komapi', this.config);

        // Housekeeping
        process.env.NODE_ENV = this.config.env;

        // Integrate with Koa
        [
            'env',
            'subdomainOffset',
            'proxy',
            'name'
        ].forEach((key) => {
            delete this[key];
            Object.defineProperty(this, key, {
                get: () => this.config[key],
                set: (v) => this.config[key] = v
            });
        });

        // Add default functionality
        this.log = bunyan.createLogger({
            name: this.name,
            streams: this.config.loggers,
            serializers: {
                err: function errorSerializer(err) {
                    if (err.stack && err.stack.split) err.stack = err.stack.split('\n');
                    return Object.assign({}, err, bunyan.stdSerializers.err(err));
                },
                request: function requestSerializer(req) {
                    function sanitize(dirty) {
                        if (!dirty) return dirty;
                        const clean = Object.assign({}, dirty);
                        [
                            'password',
                            'creditCard',
                            'credit-card'
                        ].forEach((k) => {
                            if (clean[k]) clean[k] = '*****';
                        });
                        return clean;
                    }
                    return ({
                        user: (req._passport && req[req._passport.instance._userProperty]) ? req[req._passport.instance._userProperty] : undefined,
                        body: (req.ctx.response.status >= 500) ? sanitize(req.body) : undefined,
                        headers: req.header,
                        method: req.method,
                        protocol: req.protocol,
                        url: req.url,
                        query: req.query,
                        ip: req.ip,
                        referrer: req.header['referer'] || req.header['referrer'],
                        userAgent: req.header['user-agent'],
                        httpVersion: req.httpVersion,
                        trailers: req.trailers,
                        version: req.req.version,
                        clientClosed: req.req.clientClosed
                    });
                },
                response: function responseSerializer(res) {
                    return ({
                        status: res.status,
                        headers: res.headers,
                        length: res.length,
                        type: res.type,
                        body: (res.status >= 500 && parseInt(res.length, 10) <= 1024) ? res.body : undefined
                    });
                }
            }
        });

        // Log errors
        this.on('error', (err, ctx) => {
            if (ctx) return ctx.log.error({
                latency: Math.floor((Date.now() - ctx.request._startAt) / 1000),
                request: ctx.request,
                response: ctx.response,
                err: err,
                context: 'request'
            }, 'Application Request Error');
            this.log.error({
                err: err,
                context: 'application'
            }, 'Application Error');
        });

        // Should fail fast on unhandled exceptions and rejections - and log them
        process.on('uncaughtException', (err) => {
            this.log.fatal({
                err: err,
                context: 'application'
            }, 'Uncaught Exception Error');
            process.exit(1);
        });
        process.on('unhandledRejection', (err, p) => {
            this.log.fatal({
                err: err,
                promise: p,
                context: 'application'
            }, 'Unhandled Rejected Promise');
            process.exit(1);
        });

        // Set up mandatory middleware
        this.use(responseDecorator());
        this.use(errorHandler());

        // Create prototype helpers for the native koa objects
        this.context = Object.assign(this.context, context(this));
        this.request = Object.assign(this.request, request(this));
        this.response = Object.assign(this.response, response(this));
    }

    // Helper middlewares
    get mw() {
        const app = this;
        return {
            authenticate: function authenticate(...args) {
                if (!app.request.login) throw new Error('Cannot use authentication middleware without enabling "authInit" first');
                return app.passport.authenticate(...args);
            },
            bodyParser,
            compress,
            cors,
            etag: (opts) => compose([conditional(), etag(opts)]),
            ensureAuthenticated: function ensureAuthenticated() {
                return function ensureAuthenticated(ctx, next) {
                    if (!ctx.isAuthenticated()) throw Boom.unauthorized('Access to this resource requires authentication.');
                    return next();
                };
            },
            ensureSchema: function ensureSchema(schema, opts) {
                opts = Object.assign({}, {
                    key: 'body',
                    sendSchema: '$schema'
                }, opts);
                if (['body', 'params', 'query'].indexOf(opts.key) === -1) throw new Error(`You can not enforce a schema to '${opts.key}'. Only allowed values are 'body', 'params' or 'query`);
                let validate = app.schema.compile(schema);
                return async function ensureSchema(ctx, next) {
                    if (opts.sendSchema) {
                        if (typeof opts.sendSchema === 'function' && opts.sendSchema(ctx)) return ctx.send(schema);
                        else if (ctx.request.method === 'GET' && ctx.request.query[opts.sendSchema] !== undefined && ctx.request.query[opts.sendSchema] !== 'false')  return ctx.send(schema);
                    }
                    let valid = await validate(ctx.request[opts.key]);
                    if (!valid) throw Schema.parseValidationErrors(validate.errors, schema, undefined, ctx.request[opts.key]);
                    return next();
                };
            },
            requestLogger,
            route: function route(...middlewares) {
                let path = middlewares.pop();
                let router = routes(path, app, middlewares);
                let fn = compose([router.routes(), router.allowedMethods({
                    throw: true,
                    notImplemented: () => new Boom.notImplemented(),
                    methodNotAllowed: () => new Boom.methodNotAllowed()
                })]);
                Object.defineProperty(fn, 'name', {
                    value: 'routeHandler'
                });
                return fn;
            },
            headers: headers,
            static: serve,
            views
        };
    }

    // Configuration
    authInit(...strategies) {
        if (this.request.login) throw new Error('Cannot initialize authentication more than once');
        KomapiPassport.mutateApp(this);

        // Register strategies
        strategies.forEach((s) => this.passport.use(s));

        return this.use(this.passport.initialize());
    }
    models(path) {
        if (!this.orm) throw new Error('Cannot load models before initializing an objection instance. Use `app.objection()` before attempting to load models.');
        return models(path, this);
    }
    objection(opts) {
        if (this.orm) throw new Error('Cannot initialize ORM more than once');
        this.orm = {
            $Model: class KomapiObjectionModel extends Objection.Model {},
            $transaction: Objection.transaction,
            $ValidationError: Objection.ValidationError
        };
        this.orm.$Model.knex(opts.knex || Knex(opts));
        this.orm.$migrate = this.orm.$Model.knex().migrate;
        this.orm.$Model.knex().on('query-error', (err, obj) => {
            this.log.error({
                err: err,
                orm: obj,
                context: 'orm'
            }, 'ORM Query Error');
        });

        // Patch objection with custom plugins
        [
            objectionSoftDelete,
            objectionRestify,
            objectionTimestamps
        ].forEach((fn => this.orm.$Model = fn(this.orm.$Model, this)));
    }

    // Private overrides of Koa's methods
    use(mountAt, ...fn) {
        if (typeof mountAt === 'function') fn.unshift(mountAt);
        if (typeof mountAt !== 'string') mountAt = '/';
        if (fn.length > 1) {
            let name = `[${fn.map((f) => f.name).join(', ')}]`;
            fn = compose(fn);
            Object.defineProperty(fn, 'name', {
                value: name
            });
        }
        else fn = fn.pop();
        if (mountAt !== '/') {
            let name = fn.name;
            fn = mount(mountAt, fn);
            Object.defineProperty(fn, 'name', {
                value: name
            });
        }
        if (this.config.routePrefix !== '/') fn = mount(this.config.routePrefix, fn);
        this.log.debug({
            mountedAt: mountAt,
            middleware: fn.name || '(anonymous)',
            context: 'middleware'
        }, 'Registering middleware');
        super.use(fn);

        // Check if we should move it - done this way to leverage default checks on middleware
        if (fn.registerBefore) {
            const addBeforeIndex = _.findIndex(this.middleware, (mw) => mw.name === fn.registerBefore);
            if (addBeforeIndex > -1) {
                this.middleware.pop();
                this.middleware.splice(addBeforeIndex, 0, fn);
            }
        }

        return fn;
    }
    createContext(req, res) {
        let ctx = super.createContext(req, res);
        ctx.send = ctx.send.bind(ctx);
        ctx.sendIf = ctx.sendIf.bind(ctx);
        ctx.request._startAt = Date.now();
        ctx.request.reqId = (this.config.proxy && ctx.request.headers['x-request-id']) ? ctx.request.headers['x-request-id'] : uuid.v4();
        ctx.log = this.log.child({
            req_id: ctx.request.reqId,
            context: 'request'
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
            state: this.state
        };
    }

    /**
     * Start application using the built-in listen function in Koa
     *
     * @param {Mixed} ...
     * @return {Server}
     */
    listen (...args) {

        // Perform health check - intentionally not returning the promise to not delay startup.
        this.healthCheck();

        // Start Koa
        const server = super.listen(...args);

        // Log
        this.log.info({
            context: 'application'
        }, `${this.name} started in ${this.env} mode`);

        // Return server
        return server;
    }

    /**
     * Perform various health checks
     */
    async healthCheck() {

        // Check unsupported amount of middlewares
        if (this.middleware.length > 4000) this.log.warn({
            context: 'application'
        }, `Komapi was started with ${this.middleware.length} middlewares. Please note that more than 4000 middlewares is not supported and could cause stability and performance issues.`);

        // Check pending migrations
        if (this.orm && this.orm.$migrate) {
            const [allMigrations, completedMigrations] = await this.orm.$migrate._migrationData();
            if (_.difference(allMigrations, completedMigrations).length > 0) this.log.warn({
                context: 'orm'
            }, 'There are pending migrations! Run `app.orm.$migrate.latest()` to run all pending migrations.');
        }
    }
}