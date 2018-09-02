// Dependencies
import Komapi from '../lib/Komapi';
import Pino from 'pino';
import defaultsDeep from 'lodash.defaultsdeep';

// Types
export interface RequestLoggerOptions {
  level: Pino.Level;
}
// Init
const defaultOptions: RequestLoggerOptions = {
  level: 'info',
};

// Exports
export default function requestLoggerMiddlewareFactory(options: Partial<RequestLoggerOptions> = {}): Komapi.Middleware {
  const opts = defaultsDeep({}, options, defaultOptions);
  return async function requestLoggerMiddleware(ctx, next) {
    try {
      await next();
    } finally {
      ctx.request.log[opts.level](
        {
          startAt: ctx.request.startAt,
          latency: Math.ceil(Date.now() - ctx.request.startAt),
          request: ctx.request,
          response: ctx.response,
        },
        'Request handled',
      );
    }
  };
}
