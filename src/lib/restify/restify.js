'use strict';

// Dependencies
import Boom from 'boom';

// Init
export default class Restify {
    constructor(resources) {
        this.resources = resources;
        // this.reference = this.buildReference();
    }
    buildReference() {
        this.resources.forEach((resource) => {
            if (this.reference[resource.Model.name]) throw new Error(`REST resources must be unique! Unable to register '${resource.Model.name}' as REST resource more than once.`);
            this.reference[resource.Model.name] = resource;
        });
    }
    static getIdParameter(resource) {
        const map = {
            integer:   '\(:id(\\d+)\)',
            string: '\(:id(\\w+)\)'
        };
        let out;
        if (resource.Model.jsonSchema && resource.Model.jsonSchema.properties && resource.Model.jsonSchema.properties[resource.Model.getIdProperty()]) out = map[resource.Model.jsonSchema.properties[resource.Model.getIdProperty()].type];
        if (out) return out;
        return '\(:id(\\S+)\)';
    }
    static middlewares() {
        return [
            verifyoDataVersion,
            decorateResponse
        ];
    }
    register(router) {
        this.resources.forEach((resource) => {
            resource.manager = this;
            resource.oData({
                reference: this.reference
            });
            let baseRoute = `${resource.basePath}`;
            resource.routes.forEach((route) => {
                let path = baseRoute;
                if (route.id) path += this.constructor.getIdParameter(resource);
                router[route.method](path, route.handler);
            });
        });
    }
}

// Middlewares
function verifyoDataVersion(ctx, next) {
    if (ctx.headers['OData-Version'] && ctx.headers['OData-Version'] !== '4.0') throw Boom.badRequest(`Request version '${ctx.headers['OData-Version']}' is not a valid request version. The only supported versions are '4.0'.`);
    return next();
}
function decorateResponse(ctx, next) {
    return next();
}