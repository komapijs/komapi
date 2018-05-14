// Dependencies
import Koa from 'koa';
import Boom from 'boom';
import { toArray } from 'lodash';

// Types
declare module 'boom' {
  function boomify(error: Error, options?: Boom.Options<object>): Boom<Error>;
  // tslint:disable-next-line interface-name
  interface Payload {
    code?: number;
    data?: object;
    errors?: object[];
    stack?: string[];
  }
}
interface IApplicationError extends Error {
  status?: number;
  statusCode?: number;
  data?: object;
}
interface IApplicationErrorPayload extends Boom.Payload {
  data?: object;
  stack?: string[];
}

// Exports
export default (): Koa.Middleware =>
  async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (applicationError) {
      const err: IApplicationError = applicationError;
      let error: Boom<any>;

      // Normalize error object
      try {
        if (!(applicationError instanceof Error)) throw new Error('Cannot handle non-errors as errors!');
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
      let body: string | object = Boom.notAcceptable().toString();

      // Check for dev and include dev stuff
      if (ctx.app.env !== 'production') {
        error.output.payload.data = error.data || undefined;
        if (error.isServer) {
          error.output.payload.stack = toArray(
            error.stack && error.stack.split ? error.stack.split('\n') : error.stack,
          );
        }
      }

      // Convert boom response to proper format
      const payload = {
        error: {
          code: error.output.payload.code || '',
          status: error.output.payload.statusCode,
          message: error.output.payload.message,
          errors: error.output.payload.errors,
          data: error.output.payload.data,
          stack: error.output.payload.stack,
        },
      };

      // Respond with the proper format
      const format = ctx.accepts(['json', 'text']);
      if (format === 'json') {
        status = error.output.statusCode;
        headers = error.output.headers; // eslint-disable-line prefer-destructuring
        body = payload;
      } else if (format === 'text') {
        status = error.output.statusCode;
        headers = error.output.headers; // eslint-disable-line prefer-destructuring
        body = JSON.stringify(payload, null, 2);
      }

      // Emit the error
      ctx.set(headers);
      ctx.status = status;
      ctx.body = body;
      if (ctx.status >= 500) ctx.app.emit('error', err, ctx);
    }
  };
