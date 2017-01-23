// Dependencies
import validateConfig from '../lib/config';

// Init
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
export default (opts = {}) => {
  const config = validateConfig(opts, configSchema);
  async function requestLogger(ctx, next) {
    try {
      await next();
    } finally {
      config.logger(ctx);
    }
  }
  requestLogger.registerBefore = 'errorHandler';
  return requestLogger;
};
