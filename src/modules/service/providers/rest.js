'use strict';

// Dependencies
import Service from '../service';
import Boom from 'boom';

// Exports
export default class RestService extends Service {

    /**
     * A JSON Schema describing and validating the data format
     * @returns {mixed}
     */
    // get $dataSchema() {
    //     return null;
    // }

    /**
     * A JSON Schema describing and validating the query format
     * @returns {Object}
     */
    // get $querySchema() {
    //     return {
    //         $schema: 'http://json-schema.org/draft-04/schema#',
    //         title: 'Komapi REST query parameters',
    //         type: 'object',
    //         properties: {
    //             $filter: {
    //                 description: 'Filter result set',
    //                 type: 'string'
    //             },
    //             $sort: {
    //                 description: 'Sort the result set',
    //                 type: 'array',
    //                 items: {
    //                     type: 'string'
    //                 },
    //                 uniqueItems: true
    //             },
    //             $skip: {
    //                 description: 'Skip this amount of records (offset)',
    //                 type: 'integer',
    //                 minimum: 0
    //             },
    //             $top: {
    //                 description: 'Limit number of records to this number',
    //                 type: 'integer',
    //                 minimum: 1,
    //                 maximum: 100,
    //                 default: 10
    //             },
    //             $expand: {
    //                 description: 'Expand related objects',
    //                 type: 'array',
    //                 items: {
    //                     type: 'string'
    //                 },
    //                 uniqueItems: true
    //             },
    //             $select: {
    //                 description: 'Limit returned attributes to these attributes',
    //                 type: 'array',
    //                 items: {
    //                     type: 'string'
    //                 },
    //                 uniqueItems: true
    //             },
    //             $count: {
    //                 description: 'Add total number of records to response',
    //                 type: 'boolean',
    //                 default: false
    //             }
    //         }
    //     };
    // }

    /**
     * Bootstrapping code here
     * @param {string} path
     */
    $setup(path) {
        super.$setup(path);

        // Add REST hooks
        Object.keys(this.$routes).forEach((operation) => {
            function restFormatter(args, next) {
                args.$metadata = {};
                return next().then((res) => {
                    let metadata = args.$metadata;
                    if (res) {
                        metadata.data = res;
                        return metadata;
                    }
                    return res;
                });
            }
            this.$hooks(operation, [restFormatter]);
        });
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
            get: {
                enable: !!this.get,
                method: 'GET',
                route: '/:id',
                handler: (ctx) => {
                    return this.get(ctx.params.id, {
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then((res) => {
                        if (!res) throw new Boom.notFound();
                        return ctx.send(res);
                    });
                }
            },
            find: {
                enable: !!this.find,
                method: 'GET',
                route: '/',
                handler: (ctx) => {
                    return this.find({
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then(ctx.send);
                }
            },
            create: {
                enable: !!this.create,
                method: 'POST',
                route: '/',
                handler: (ctx) => {
                    return this.create(ctx.request.body, {
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then(ctx.send);
                }
            },
            update: {
                enable: !!this.update,
                method: 'PUT',
                route: '/:id',
                handler: (ctx) => {
                    return this.update(ctx.params.id, ctx.request.body, {
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then(ctx.send);
                }
            },
            patch: {
                enable: !!this.patch,
                method: 'PATCH',
                route: '/:id',
                handler: (ctx) => {
                    return this.patch(ctx.params.id, ctx.request.body, {
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then(ctx.send);
                }
            },
            delete: {
                enable: !!this.delete,
                method: 'DELETE',
                route: '/:id',
                handler: (ctx) => {
                    return this.delete(ctx.params.id, {
                        user: ctx.request.auth,
                        query: ctx.request.query
                    }).then(() => ctx.send(null));
                }
            }
        };
    }

    // Operations
    // find(params = {}) {}
    // get(id, params = {}) {}
    // create(data, params = {}) {}
    // update(id, data = {} params = {}) {}
    // patch(id, data = {}, params = {}) {}
    // delete(id, params = {}) {}
}