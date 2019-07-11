import Pino from 'pino';
import defaultsDeep from 'lodash.defaultsdeep';
import Komapi from '../lib/Komapi';

// Types
export interface RequestLoggerOptions {
  level: Pino.Level;
}

// Init
const defaultOptions: RequestLoggerOptions = {
  level: 'info',
};

// Exports
export default function createRequestLogger(options: Partial<RequestLoggerOptions> = {}): Komapi.Middleware {
  const opts = defaultsDeep({}, options, defaultOptions);
  return async function requestLoggerMiddleware(ctx, next) {
    try {
      await next();
    } finally {
      ctx.log[opts.level](
        {
          latency: Math.ceil(Date.now() - ctx.request.startAt),
          request: ctx.request,
          response: ctx.response,
        },
        'Request handled',
      );
    }
  };
}
