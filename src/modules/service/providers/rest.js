// Dependencies
import { notFound as NotFound } from 'boom';
import Service from '../service';
import Schema from '../../json-schema/schema';

// Init
const schema = new Schema({
    useDefaults: true,
    coerceTypes: true,
    removeAdditional: true,
});

// Exports
export default class RestService extends Service {

    /**
     * A JSON Schema describing and validating the data format
     * @returns {mixed}
     */
    get $dataSchema() { // eslint-disable-line class-methods-use-this
        return undefined;
    }

    /**
     * A JSON Schema describing and validating the query format
     * @returns {mixed}
     */
    get $querySchema() { // eslint-disable-line class-methods-use-this
        return undefined;
    }

    /**
     * Bootstrapping code here
     * @param {string} path
     */
    $setup(path) {
        super.$setup(path);

        // Add REST hooks
        const dataMethods = [
            'POST',
            'PUT',
            'PATCH',
        ];
        Object.keys(this.$routes).forEach((operation) => {
            const opts = this.$routes[operation];
            const hooks = [this.constructor.$outputFormatter(), this.$querySchemaValidator()];
            if (dataMethods.indexOf(opts.method) > -1) {
                hooks.push(this.$dataSchemaValidator({
                    patch: (opts.method !== 'PUT'),
                }));
            }
            this.$hooks(operation, hooks);
        });

        // Store compiled schemas
        if (this.$dataSchema) {
            this.$_dataSchema = {
                patch: schema.compile(this.$dataSchema),
                full: schema.compile(Object.assign({}, this.$dataSchema, { required: Object.keys(this.$dataSchema.properties) })),
            };
        }
        if (this.$querySchema) this.$_querySchema = schema.compile(this.$querySchema);
    }

    /**
     * All public routes and their options
     * @example
     * // return {
     * //     find: (ctx) => this.find({
     * //         user: ctx.request.auth,
     * //         query: ctx.request.query
     * //     })
     * // };
     * @returns {Object}
     */
    get $routes() {
        return {
            options: {
                enable: true,
                method: 'OPTIONS',
                route: ['/:id', '/'],
                handler: this.$optionsRouteHandler(),
            },
            get: {
                enable: !!this.get,
                method: 'GET',
                route: '/:id',
                handler: ctx => this.get(ctx.params.id, {
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then((res) => {
                    if (!res) throw new NotFound();
                    return ctx.send(res);
                }),
            },
            find: {
                enable: !!this.find,
                method: 'GET',
                route: '/',
                handler: ctx => this.find({
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then(ctx.send),
            },
            create: {
                enable: !!this.create,
                method: 'POST',
                route: '/',
                handler: ctx => this.create(ctx.request.body, {
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then(ctx.send),
            },
            update: {
                enable: !!this.update,
                method: 'PUT',
                route: '/:id',
                handler: ctx => this.update(ctx.params.id, ctx.request.body, {
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then(ctx.send),
            },
            patch: {
                enable: !!this.patch,
                method: 'PATCH',
                route: '/:id',
                handler: ctx => this.patch(ctx.params.id, ctx.request.body, {
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then(ctx.send),
            },
            delete: {
                enable: !!this.delete,
                method: 'DELETE',
                route: '/:id',
                handler: ctx => this.delete(ctx.params.id, {
                    user: ctx.request.auth,
                    query: ctx.request.query,
                }).then(() => ctx.send(null)),
            },
        };
    }

    // Internal methods
    /**
     * Options route handler
     * @returns {Function}
     */
    $optionsRouteHandler() {
        return (ctx) => {
            const allMethods = ctx.matched.reduce((prev, cur) => prev.concat(cur.methods.filter(method => (method !== 'OPTIONS'))), []);
            const allow = [...new Set(allMethods)];
            if (allow.length === 0) throw new NotFound('Not Found');
            ctx.set('Allow', allow);
            return this.options().then(ctx.send);
        };
    }

    /**
     * Format the rest response
     * @returns {Function}
     */
    static $outputFormatter() {
        return (args, next) => {
            args.$metadata = {}; // eslint-disable-line no-param-reassign
            return next().then((res) => {
                const metadata = args.$metadata;
                if (res) {
                    metadata.data = res;
                    return metadata;
                }
                return res;
            });
        };
    }

    /**
     * Validate data using the data schema
     * @param {Object} opts Options
     * @returns {Function}
     */
    $dataSchemaValidator(opts) {
        return (args, next) => {
            if (this.$dataSchema) {
                const validator = (opts.patch) ? this.$_dataSchema.patch : this.$_dataSchema.full;
                const valid = validator(args.data);
                if (!valid) throw Schema.validationError(validator.errors, this.$dataSchema, undefined, args.data);
            }
            return next();
        };
    }
    /**
     * Validate data using the query schema
     * @returns {Function}
     */
    $querySchemaValidator() {
        return (args, next) => {
            if (this.$querySchema && args.params) {
                const valid = this.$_querySchema(args.params.query);
                if (!valid) throw Schema.validationError(this.$_querySchema.errors, this.$querySchema, 'Invalid query parameters', args.params.query);
            }
            return next();
        };
    }

    // Operations
    // find(params = {}) {}
    // get(id, params = {}) {}
    // create(data, params = {}) {}
    // update(id, data = {} params = {}) {}
    // patch(id, data = {}, params = {}) {}
    // delete(id, params = {}) {}
    options() {
        return Promise.resolve({
            schemas: {
                query: this.$querySchema || undefined,
                data: this.$dataSchema || undefined,
            },
        });
    }
}
