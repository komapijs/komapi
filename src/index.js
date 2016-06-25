'use strict';

// Dependencies
import Koa from 'koa';
import defaultConfig from './lib/config';
import Schema from './lib/schema';
import context from './lib/context';
import request from './lib/request';
import response from './lib/response';
import bunyan from 'bunyan';
import Boom from 'boom';
import mount from 'koa-mount';
import compose from 'koa-compose';
import uuid from 'node-uuid';
import Knex from 'knex';
import {Model} from 'objection';
import _ from 'lodash';
import models from './lib/models';

// Middlewares
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import routes from './middleware/routeHandler';
import helmet from './middleware/helmet';
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
        this.config = Object.assign({}, defaultConfig(process.env.NODE_ENV || config.env), config);
        this.passport = new KomapiPassport;

        // Validate config
        Schema.apply('config', this.config);

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
        this.use(errorHandler());

        // Create prototype helpers for the native koa objects
        this.context = Object.assign(this.context, context(this));
        this.request = Object.assign(this.request, request(this));
        this.response = Object.assign(this.response, response(this));
    }

    // Helper middleware
    ensureAuthenticated() {
        return function ensureAuthenticated(ctx, next) {
            if (!ctx.isAuthenticated()) throw Boom.unauthorized('Access to this resource requires authentication.');
            return next();
        };
    }

    // Self registering middleware
    auth(mountAt, ...args) {
        if (!this.request.login) throw new Error('Cannot use authentication middleware without running "authInit" first');
        if (typeof mountAt !== 'string' || (typeof mountAt === 'string' && !mountAt.startsWith('/'))) {
            args.unshift(mountAt);
            mountAt = '/';
        }
        return this.use(mountAt, this.passport.authenticate(...args));
    }
    bodyParser(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        return this.use(mountAt, bodyParser(opts));
    }
    compress(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        return this.use(mountAt, compress(opts));
    }
    cors(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        return this.use(mountAt, cors(opts));
    }
    etag(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        this.use(mountAt, conditional());
        return this.use(mountAt, etag(opts));
    }
    requestLogger(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        return this.use(mountAt, requestLogger(opts));
    }
    route(mountAt, path, ...middlewares) {
        if (typeof path === 'function') {
            middlewares.unshift(path);
            path = mountAt;
            mountAt = '/';
        }
        else if (!path) {
            path = mountAt;
            mountAt = '/';
        }
        let router = routes(path);
        let fn = compose([...middlewares, router.routes(), router.allowedMethods({
            throw: true,
            notImplemented: () => new Boom.notImplemented(),
            methodNotAllowed: () => new Boom.methodNotAllowed()
        })]);
        Object.defineProperty(fn, 'name', {
            value: 'routeHandler'
        });
        return this.use(mountAt, fn);
    }
    helmet(mountAt, opts) {
        if (typeof mountAt === 'object') {
            opts = mountAt;
            mountAt = '/';
        }
        return this.use(mountAt, helmet(opts));
    }
    serve(mountAt, serveFrom, opts) {
        return this.use(mountAt, serve(serveFrom, opts));
    }
    views(templateRoot, opts) {
        return this.use(views(templateRoot, opts));
    }

    // Configuration
    models(path) {
        if (!this.orm) throw new Error('Cannot load models before initializing an objection instance. Use `app.objection()` before attempting to load models.');
        return models(path, this);
    }
    objection(opts) {
        if (this.orm) throw new Error('Cannot initialize ORM more than once');
        this.orm = {
            $Model: class KomapiObjectionModel extends Model {}
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

        // Patch
        [
            objectionSoftDelete,
            objectionRestify
        ].forEach((fn => fn(this.orm.$Model)));
    }
    authInit(...strategies) {
        if (this.request.login) throw new Error('Cannot initialize authentication more than once');
        KomapiPassport.mutateApp(this);

        // Register strategies
        strategies.forEach((s) => this.passport.use(s));

        return this.use(this.passport.initialize());
    }

    // Private overrides of Koa's methods
    use(mountAt, ...fn) {
        if (typeof mountAt === 'function') fn.unshift(mountAt);
        if (typeof mountAt !== 'string') mountAt = '/';
        if (fn.length > 1) fn = compose(fn);
        else fn = fn.pop();
        if (mountAt !== '/') fn = mount(mountAt, fn);
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
        ctx.request.reqId = uuid.v4();
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