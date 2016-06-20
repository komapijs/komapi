'use strict';

// Exports
export default function defaultConfig(env = 'development') {
    return {
        env: env,
        loggers: [
            {
                name: 'stdout',
                level: (env === 'production') ? 'warn' : 'info',
                stream: process.stdout
            },
            {
                name: 'stderr',
                level: 'warn',
                stream: process.stderr
            }
        ],
        name: 'Komapi application',
        proxy: false,
        routePrefix: '/',
        subdomainOffset: 2
    };
}