// Dependencies
import Komapi from '../lib/Komapi';
import Boom from 'boom';

// Types
declare module 'boom' {
  function boomify(error: Error, options?: Boom.Options<object>): Boom<Error>;
  interface Payload {
    code?: number | string;
    errors?: object[];
    additionalDevelopmentData?: {
      data?: object;
      stack?: string;
    };
  }
}
interface ApplicationError extends Error {
  status?: number;
  statusCode?: number;
  data?: object;
}

// Exports
export default function errorHandlerMiddlewareFactory(): Komapi.Middleware {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
      if (ctx.status === 404) throw Boom.notFound();
    } catch (applicationError) {
      const err: ApplicationError = applicationError;
      let error: Boom<any>;

      // Normalize error object
      try {
        if (!(applicationError instanceof Error)) throw new Error('Cannot handle non-errors as errors');
        error = Boom.isBoom(err)
          ? err
          : Boom.boomify(err, {
              statusCode: err.status || err.statusCode || undefined,
              decorate: err.data,
            });
      } catch (subError) {
        error = Boom.boomify(subError);
      }

      // Set defaults
      let status = Boom.notAcceptable().output.statusCode;
      let headers = {};
      let body: string | object = Boom.notAcceptable().output.payload.message;

      // Check for dev and include dev stuff
      if (ctx.app.env !== 'production') {
        error.output.payload.additionalDevelopmentData = {
          data: error.data || undefined,
          stack: error.isServer && error.stack ? error.stack : undefined,
        };
      }

      // Convert boom response to proper format
      const payload = {
        error: {
          code: error.output.payload.code || '',
          status: error.output.payload.statusCode,
          error: error.output.payload.error,
          message: error.output.payload.message,
          errors: error.output.payload.errors,
          additionalDevelopmentData: error.output.payload.additionalDevelopmentData,
        },
      };

      // Respond with the proper format
      const format = ctx.accepts(['json', 'text']);
      if (format === 'json') {
        status = error.output.statusCode;
        headers = error.output.headers;
        body = payload;
      } else if (format === 'text') {
        status = error.output.statusCode;
        headers = error.output.headers;
        body = payload.error.message;
      }

      // Respond with the error
      ctx.set(headers);
      ctx.status = status;
      ctx.body = body;
    }
  };
}
