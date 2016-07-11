'use strict';

// Dependencies
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
        this.options = Object.assign({}, defaultOpts, opts);
        this.oDataOptions = {
            $count: {
                default: false
            },
            $skip : {
                default: 0
            },
            $top: {
                allow: 100,
                default: 10
            },
            $select: {
                allow: (Model.jsonSchema && Model.jsonSchema.properties) ? Object.keys(Model.jsonSchema.properties) : false,
                default: Model.getIdColumnArray()
            },
            $expand: {
                allow: (Model.relationMappings) ? Object.keys(Model.relationMappings) : [],
                default: []
            }
        };
        this.routes = [];
    }
    oData(opts) {
        Object.assign(this.oDataOptions, opts);
        return this;
    }
    addRoute(route) {
        this.routes.push(route);
    }
    $select(columns) {
        this.oDataOptions.$select.default = columns;
    }
    $selectAllow(columns) {
        this.oDataOptions.$select.allow = columns;
    }
    $expand(relations) {
        this.oDataOptions.$expand.default = relations;
    }
    $expandAllow(relations) {
        this.oDataOptions.$expand.allow = relations;
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