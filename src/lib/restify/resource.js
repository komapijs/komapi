'use strict';

// Dependencies
import _ from 'lodash';
import pluralize from 'pluralize';
import Parser from './parser';
import Router from 'koa-router';

// Init

// Exports
export default class Resource {
    constructor(Model, opts = {}) {
        this.router = new Router();
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
        this.autoLoad = {
            create: false,
            read: false,
            readRelated: false,
            update: false,
            delete: false,
            relate: false,
            unrelate: false
        };
    }
    compile() {
        _.forOwn(this.autoLoad, (v, k) => {
            if (v) this[`_${k}`]();
        });
        return this;
    }
    oData(opts) {
        _.defaultsDeep(this.oDataOptions, opts);
        return this;
    }
    addRoute(route) {
        this.router[route.method](route.path, route.handler);
    }
    all() {
        this.autoLoad = {
            create: false,
            read: true,
            readRelated: true,
            update: false,
            delete: false,
            relate: false,
            unrelate: false
        };
        return this;
    }
    _read() {
        this.addRoute({
            method: 'get',
            path: this.basePath,
            handler: (ctx) => this.Model.query().oDataFilter(ctx.request.query, this.oDataOptions).then(ctx.send)
        });
        this.addRoute({
            method: 'get',
            path: this._getRoutePath(undefined, this.basePath, 'id'),
            handler: (ctx) => this.Model.query().findById(ctx.params.id).oDataFilter(ctx.request.query, this.oDataOptions).asOne().then(ctx.sendIf)
        });
        return this;
    }
    _readRelated() {
        let num = 0;
        let baseHandler = (ctx) => this.Model.query().findById(ctx.params.id);
        let resourceObject = this;
        function _readRelated(resource, relation, path, parentHandler, depth = 0) {
            num++;
            depth++;
            if (depth > resourceObject.oDataOptions.maxRecursionDepth) return;
            let related = resource.Model.getRelation(relation);
            let subResource = resourceObject.registry[related.relatedModelClass.name];
            if (!subResource) return;
            let idParameter = `relation${num}Id`;
            let newPath = path + resourceObject._getRoutePath(related.relatedModelClass, relation, idParameter);
            let newParentHandler = (ctx) => {
                return parentHandler(ctx).then((model) => {
                    if (!model) return null;
                    return model.$relatedQuery(relation).findById(ctx.params[idParameter]);
                });
            };
            resourceObject.addRoute({
                method: 'get',
                path: path + resourceObject._getRoutePath(related.relatedModelClass, relation),
                handler: (ctx) => parentHandler(ctx).then((model) => {
                    if (!model) return null;
                    return model.$relatedQuery(relation).oDataFilter(ctx.request.query, subResource.oDataOptions);
                }).then(ctx.sendIf)
            });
            resourceObject.addRoute({
                method: 'get',
                path: newPath,
                handler: (ctx) => parentHandler(ctx).then((model) => {
                    if (!model) return null;
                    return model.$relatedQuery(relation).findById(ctx.params[idParameter]).oDataFilter(ctx.request.query, subResource.oDataOptions);
                }).then(ctx.sendIf)
            });
            if (subResource && subResource.oDataOptions.relations) {
                subResource.oDataOptions.relations.forEach((subRelation) => _readRelated(subResource, subRelation, newPath, newParentHandler, depth));
            }
        }
        if (this.oDataOptions.relations) {
            this.oDataOptions.relations.forEach((relation) => {
                _readRelated(this, relation, this._getRoutePath(undefined, this.basePath, 'id'), baseHandler);
            });
        }
        return this;
    }
    _getRoutePath(Model, pathName, parameterName) {
        pathName = pathName || ((Model) ? Model.name : '');
        let base = `/${pathName.toLocaleLowerCase()}`.replace(/\/\//g, '/');
        if (!parameterName) return base;
        const map = {
            integer:   `\(:${parameterName}(\\d+?)\)`,
            string: `\(:${parameterName}(\\w+?)\)`,
            array: `\(:${parameterName}(\\w+?)\)`
        };
        let out = `\(:${parameterName}(\[a-zA-Z0-9_\,]+?)\)`;
        if (Model && Model.jsonSchema && Model.jsonSchema.properties[Model.getIdProperty()]) out = map[Model.jsonSchema.properties[Model.getIdProperty()].type];
        return `${base}${out}`;
    }
    // _readRelated(Model, relation, path, relations = []) {
    //     if (relations.length >= this.maxRecursionDepth) return;
    //     let related = Model.getRelation(relation);
    //     return {
    //         method: 'get',
    //         path: path + this._getOneRoute(related.relatedModelClass.name, 'relationId'),
    //         handler: (ctx) => this.Model.query().findById(ctx.params.id).then((model) => {
    //             if (!model) return null;
    //             return model.relatedQuery.oDataFilter(ctx.request.query, this.oDataOptions).withMeta('minimal').asOne()
    //         }).then(ctx.sendIf)
    //     };
    // }
}