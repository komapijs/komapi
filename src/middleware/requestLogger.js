'use strict';

// Dependencies
import Config from '../lib/config';

// Init
const configSchema = (Joi) => Joi.object({
    logger: Joi.func().optional()
});

// Exports
export default (options = {}) => {

    // Validate options
    options = Config(options, configSchema);

    if (!options.logger) options.logger = function logger(ctx) {
        return ctx.log.info({
            latency: Math.floor((Date.now() - ctx.request._startAt) / 1000),
            request: ctx.request,
            response: ctx.response,
            logger: 'requestLogger'
        });
    };
    async function requestLogger(ctx, next) {
        try {
            await next();
        }
        finally {
            options.logger(ctx);
        }
    }
    requestLogger.registerBefore = 'errorHandler';
    return requestLogger;
};