// Dependencies
import bodyParser from 'koa-bodyparser';
import Service from '../service';

// Exports
export default class RestService extends Service {

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
     * Bootstrapping code here
     * @param {string} path
     */
    $setup(path) {
        super.$setup(path);
        this.$hooks(null, this.constructor.$outputFormatter());
    }

    /**
     * Route handler for GET /:id
     * @param {ctx} ctx Koa context object
     */
    $get(ctx) {
        return this.get(ctx.params.id, {
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(res => ctx.sendIf(res, null, null, !!(res && res.data)));
    }

    /**
     * Route handler for GET /
     * @param {ctx} ctx Koa context object
     */
    $find(ctx) {
        return this.find({
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(ctx.send);
    }

    /**
     * Route handler for POST /
     * @param {ctx} ctx Koa context object
     */
    $create(ctx) {
        return this.create(ctx.request.body, {
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(ctx.send);
    }

    /**
     * Route handler for PUT /:id
     * @param {ctx} ctx Koa context object
     */
    $update(ctx) {
        return this.update(ctx.params.id, ctx.request.body, {
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(ctx.send);
    }

    /**
     * Route handler for PATCH /:id
     * @param {ctx} ctx Koa context object
     */
    $patch(ctx) {
        return this.patch(ctx.params.id, ctx.request.body, {
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(ctx.send);
    }

    /**
     * Route handler for DELETE /:id
     * @param {ctx} ctx Koa context object
     */
    $delete(ctx) {
        return this.delete(ctx.params.id, {
            auth: ctx.request.auth,
            query: ctx.request.query,
        }).then(() => ctx.send(null));
    }

    /**
     * Helper function for automatically registering routes
     * @param {Router=} router Router instance to use
     * @returns {Router}
     */
    $getRoutes(...args) {
        const router = super.$getRoutes(...args);

        // Routes
        if (this.get) router.get('/:id', this.$get.bind(this));
        if (this.find) router.get('/', this.$find.bind(this));
        if (this.create) router.post('/', bodyParser(), this.$create.bind(this));
        if (this.update) router.put('/:id', bodyParser(), this.$update.bind(this));
        if (this.patch) router.patch('/:id', bodyParser(), this.$patch.bind(this));
        if (this.delete) router.delete('/:id', this.$delete.bind(this));

        return router;
    }

    // Methods to implement
    // find(params = {}) {}
    // get(id, params = {}) {}
    // create(data, params = {}) {}
    // update(id, data = {} params = {}) {}
    // patch(id, data = {}, params = {}) {}
    // delete(id, params = {}) {}
}
