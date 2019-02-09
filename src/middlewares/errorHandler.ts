// Imports
import Komapi from '../lib/Komapi';

// Exports
export default function errorHandlerMiddlewareFactory(): Komapi.Middleware {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
      // if (ctx.status === 404) throw Boom.notFound();
    } catch (err) {
      ctx.status = 500;
      ctx.body = err.message;
    }
  };
}
