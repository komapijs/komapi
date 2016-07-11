'use strict';

// Dependencies
import Restify from '../lib/restify/restify';
import Router from 'koa-router';

// Exports
export default function restify(resources, middlewares) {

    // Prepare
    let restify = new Restify(resources);
    let containerRouter = new Router();

    // Register middlewares
    containerRouter.use(...[...middlewares, Restify.middlewares()]);

    // Register routes
    restify.register(containerRouter);

    // Register the router
    return containerRouter;
}