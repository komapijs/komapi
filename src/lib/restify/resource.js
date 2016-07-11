'use strict';

// Dependencies
import _ from 'lodash';
import pluralize from 'pluralize';

// Init
const defaultOpts = {
    maxRecursionDepth: 2
};

// Exports
export default class Resource {
    constructor(Model, opts = {}) {
        this.basePath = opts.path || `/${pluralize(Model.name)}`;
        this.Model = Model;
        this.options = _.defaults(defaultOpts, opts);
        this.oDataOptions = {};
        this.routes = [];
    }
    oData(opts) {
        _.defaultsDeep(this.oDataOptions, opts);
        return this;
    }
    addRoute(route) {
        this.routes.push(route);
    }
    all() {
        [
            // 'create',
            'read',
            // 'update',
            // 'delete',
            // 'relate',
            // 'unrelate'
        ].forEach((action) => this[action]());
        return this;
    }
    read() {
        this.addRoute({
            method: 'get',
            handler: (ctx) => this.Model.query().oDataFilter(ctx.request.query, this.oDataOptions).withMeta('minimal').then(ctx.send)
        });
        this.addRoute({
            method: 'get',
            id: true,
            handler: (ctx) => this.Model.query().findById(ctx.params.id).oDataFilter(ctx.request.query, this.oDataOptions).withMeta('minimal').asOne().then(ctx.sendIf).then(ctx.send)
        });
        return this;
    }
}