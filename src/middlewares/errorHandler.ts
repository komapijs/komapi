// Imports
import Boom from 'boom';
import get from 'lodash.get';
import Komapi from '../lib/Komapi';

// Types
declare module 'boom' {
  function boomify(error: Error, options?: Boom.Options<object>): Boom<Error>;
}

// Helpers
function serializeJsonApiError(error: Boom) {
  return {
    status: error.output.statusCode,
    title: error.output.payload.error,
    detail: error.output.payload.message,
  };
}

// Exports
export default function errorHandlerMiddlewareFactory(): Komapi.Middleware {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
      // if (ctx.status === 404) throw Boom.notFound();
    } catch (err) {
      let error: Boom<any>;

      // Normalize error object
      try {
        error = Boom.isBoom(err)
          ? err
          : Boom.boomify(err, {
              statusCode: err.status || err.statusCode || undefined,
              decorate: err.data,
            });
      } catch (subError) {
        error = Boom.boomify(subError);
      }

      // Respond with the proper format
      const format = ctx.accepts(['application/vnd.api+json', 'json', 'html', 'text']);

      // Set default response
      let status = Boom.notAcceptable().output.statusCode;
      let headers = {};
      let body: string | object = Boom.notAcceptable().output.payload.message;

      if (format === 'application/vnd.api+json') {
        status = error.output.statusCode;
        headers = error.output.headers;
        body = { errors: get(error, 'data.errors', [error]).map(serializeJsonApiError) };
      } else if (format === 'text') {
        status = error.output.statusCode;
        headers = error.output.headers;
        body = error.output.payload.message;
      }

      // Respond
      ctx.set(headers);
      ctx.status = status;
      ctx.body = body;
    }
  };
}

// TODO: Implement https://jsonapi.org/format/#errors
