'use strict';

// Dependencies
import path from 'path';
import Router from 'koa-router';
import findFiles from '../lib/findFiles';

// Exports
export default function routeHandler(routePath, app, middlewares) {

    // Prepare
    let containerRouter = new Router();

    // Shortcut for route modules
    if (typeof routePath === 'function') {
        let router = new Router();
        routePath(router, app);
        containerRouter.use('', ...[...middlewares, router.routes()]);
        return containerRouter;
    }

    // Create a list of files
    const files = findFiles(routePath);

    // Handle the files
    files.forEach((file) => {
        let mountAt = '/' + path.relative(routePath, file)
                .split(path.sep)
                .join('/');
        mountAt = mountAt
            .replace(/\/index.js$/, '')
            .replace(/.js$/, '')
            .replace(/^\/$/, '');
        let router = new Router();
        let route = require.main.require(file);
        if (route.default) route.default(router, app);
        else route(router, app);
        containerRouter.use(mountAt, ...[...middlewares, router.routes()]);
    });

    // Register the router
    return containerRouter;
}