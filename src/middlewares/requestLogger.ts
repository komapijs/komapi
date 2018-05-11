// Dependencies
import Koa from 'koa';

// Init
const defaultRequestLogger = (ctx: Koa.Context) =>
  ctx.log.info(
    {
      startAt: ctx.startAt,
      latency: Math.floor((Date.now() - ctx.startAt.getTime()) / 1000),
      request: ctx.request,
      response: ctx.response,
      source: 'requestLogger',
    },
    'Request handled',
  );

// Exports
export default function requestLoggerMiddlewareFactory(
  logger: (ctx: Koa.Context) => void = defaultRequestLogger,
): Koa.Middleware {
  return async function requestLoggerMiddleware(ctx, next) {
    try {
      await next();
    } finally {
      logger(ctx);
    }
  };
}
