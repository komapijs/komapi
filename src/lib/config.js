'use strict';

// Exports
export default function defaultConfig(env = 'development') {
    return {
        env: env,
        loggers: [],
        name: 'Komapi application',
        proxy: false,
        routePrefix: '/',
        subdomainOffset: 2
    };
}