'use strict';

// Dependencies
import _ from 'lodash';

// Exports
export default class Service {

    /**
     * All public routes and their options
     * @example
     * // return {
     * //     find: {
     * //         enable: !!this.find,
     * //         method: 'GET',
     * //         route: '/',
     * //         handler: (ctx) => this.find({
     * //             user: ctx.request.auth,
     * //             query: ctx.request.query
     * //         })
     * //     }
     * // };
     * @returns {Object}
     */
    get $routes() {
        return {};
    }

    /**
     * Helper function for automatically registering routes
     * @returns {Router}
     */
    registerRoutes(router) {
        _.forOwn(this.$routes, (options, operation) => {
            if (options.enable) {
                let routes = _.castArray(options.route);
                routes.forEach((route) => {
                    router[options.method.toLowerCase()](route, options.handler);
                });
            }
        });
        return router;
    }

    /**
     * Initiate the service
     * @final
     * @param Komapi app Application instance
     */
    constructor(app) {
        this.app = app;
        this.hooks = {};
    }

    /**
     * Bootstrapping code here
     */
    $setup() {}

    /**
     * Set or get hooks
     * @param {String=} operation The operation to get or set hooks for
     * @param {Array=} hooks An object containing all hooks
     */
    $hooks(operation, hooks) {
        if (!operation) return this.hooks;
        if (hooks) this.hooks[operation] = this.$hooks(operation).concat(hooks);
        return this.hooks[operation] || [];
    }
}