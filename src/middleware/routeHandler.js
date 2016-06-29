'use strict';

// Dependencies
import path from 'path';
import recursiveReadDir from 'recursive-readdir-sync';
import Router from 'koa-router';

// Exports
export default function routeHandler(routePath, app) {

    // Prepare
    let containerRouter = new Router();

    // Create a list of files
    let files = [];
    if (routePath.endsWith('.js')) {
        files.push(routePath);
    }
    else {
        files = recursiveReadDir(routePath).filter((p) => p.endsWith('.js'));
    }

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
        file = path.resolve(file);
        let route = require.main.require(file);
        if (route.default) route.default(router, app);
        else route(router, app);
        containerRouter.use(mountAt, router.routes());
    });

    // Register the router
    return containerRouter;
}