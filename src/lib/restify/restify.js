'use strict';

// Dependencies
import Boom from 'boom';

// Init
export default class Restify {
    constructor(resources) {
        this.registry = {};
        this.resources = resources;
        this._buildRegistry();
    }
    _buildRegistry() {
        this.resources.forEach((resource) => {
            if (this.registry[resource.Model.name]) throw new Error(`REST resources must be unique! Unable to register '${resource.Model.name}' as REST resource more than once.`);
            this.registry[resource.Model.name] = resource;
            resource.registry = this.registry;
        });
    }
    middlewares() {
        return [
            verifyoDataVersion
        ];
    }
}

// Middlewares
function verifyoDataVersion(ctx, next) {
    if (ctx.headers['OData-Version'] && ctx.headers['OData-Version'] !== '4.0') throw Boom.badRequest(`Request version '${ctx.headers['OData-Version']}' is not a valid request version. The only supported versions are '4.0'.`);
    return next();
}