'use strict';

// Dependencies
import _ from 'lodash';
import pluralize from 'pluralize';
import Parser from './parser';

// Init

// Exports
export default class Resource {
    constructor(Model, opts = {}) {
        this.registry = null;
        this.basePath = opts.path || `/${pluralize(Model.name).toLowerCase()}`;
        this.Model = Model;
        this.oDataOptions = _.defaultsDeep({}, opts, {
            resource: this,
            idColumnArray: this.Model.getIdColumnArray(),
            columns: this.Model.getAllColumns(),
            relations: (this.Model.relationMappings) ? Object.keys(this.Model.relationMappings) : null
        }, Parser.defaultOptions);
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