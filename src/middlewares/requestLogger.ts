// Dependencies
import Koa from 'koa';
import Pino from 'pino';
import { defaultsDeep } from 'lodash';

// Types
export interface RequestLoggerOptions {
  level: Pino.Level;
}
// Init
const defaultOptions: RequestLoggerOptions = {
  level: 'info',
};

// Exports
export default function requestLoggerMiddlewareFactory(options: Partial<RequestLoggerOptions> = {}): Koa.Middleware {
  const opts = defaultsDeep({}, options, defaultOptions);
  return async function requestLoggerMiddleware(ctx, next) {
    try {
      await next();
    } finally {
      ctx.log[opts.level](
        {
          startAt: ctx.startAt,
          latency: Math.ceil(Date.now() - ctx.startAt),
          request: ctx.request,
          response: ctx.response,
        },
        'Request handled',
      );
    }
  };
}
