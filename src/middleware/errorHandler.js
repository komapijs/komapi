// Dependencies
import Boom from 'boom';

// Exports
export default () => async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    let error;

    // Normalize error object
    try {
      if (!(err instanceof Error)) throw new Error('Cannot handle non-errors as errors!');
      error = err.isBoom ? err : Boom.create(err.status || err.statusCode || undefined, err, err.data);
    } catch (subError) {
      error = Boom.wrap(subError);
    }

    // Set defaults
    let status = Boom.notAcceptable().output.statusCode;
    let headers = {};
    let body = Boom.notAcceptable().toString();

    // Check for dev and include dev stuff
    if (ctx.app.env === 'development') {
      error.output.payload.data = error.data || undefined;
      if (error.output.statusCode >= 500) {
        error.output.payload.stack = (error.stack && error.stack.split) ? error.stack.split('\n') : error.stack;
      }
    }

    // Convert boom response to proper format
    error.output.payload = {
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
    const format = ctx.accepts([
      'json',
      'text',
    ]);
    if (format === 'json') {
      status = error.output.statusCode;
      headers = error.output.headers; // eslint-disable-line prefer-destructuring
      body = error.output.payload;
    } else if (format === 'text') {
      status = error.output.statusCode;
      headers = error.output.headers; // eslint-disable-line prefer-destructuring
      body = JSON.stringify(error.output.payload, null, 2);
    }

    // Emit the error
    ctx.request.err = err; // eslint-disable-line no-param-reassign
    ctx.send(body, { status, headers });
    if (ctx.status >= 500) ctx.app.emit('error', err, ctx);
  }
};
