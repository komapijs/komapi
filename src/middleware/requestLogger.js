// Dependencies
import validateConfig from '../lib/config';

// Init
/**
 * Logger function
 *
 * @callback requestLogger
 * @param {Context} ctx - Komapi context for this request log
 * @returns {Object}
 */
function logger(ctx) {
  return ctx.log.info({
    latency: Math.floor((Date.now() - ctx.request.startAt) / 1000),
    request: ctx.request,
    response: ctx.response,
    logger: 'requestLogger',
  });
}
const configSchema = Joi => Joi.object({
  logger: Joi.func().optional().default(logger),
});

// Exports
/**
 * Create request logger middleware
 *
 * @param {Object=} opts - Schema to use for validation
 * @param {requestLogger=} opts.logger - A request logger function
 * @returns {KoaCompatibleMiddleware} - Returns the request logging middleware
 */
export default function createRequestLogger(opts = {}) {
  const config = validateConfig(opts, configSchema);
  async function requestLogger(ctx, next) { // eslint-disable-line require-jsdoc
    try {
      await next();
    } finally {
      config.logger(ctx);
    }
  }
  requestLogger.registerBefore = 'errorHandler';
  return requestLogger;
}
