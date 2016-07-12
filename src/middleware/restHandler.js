'use strict';

// Dependencies
import Restify from '../lib/restify/restify';
import Router from 'koa-router';

// Exports
export default function restify(resources, app, middlewares) {

    // Prepare
    let restify = new Restify(resources);
    let containerRouter = new Router();

    // Register middlewares
    containerRouter.use(...[...middlewares, restify.middlewares()]);

    // Register routes
    restify.resources.map((resource) => {
        resource.compile();
        containerRouter.use(resource.router.routes());
    });

    // Register the router
    return containerRouter;
}