// Dependencies
import Boom from 'boom';

// Exports
export default () => async function errorHandler(ctx, next) {
    try {
        await next();
        if (ctx.status >= 400) ctx.throw(ctx.status);
    } catch (err) {
        let error = err;

        // Unknown error?
        if (!err.isBoom) {
            try {
                error = Boom.wrap(err, err.status || 500);
            } catch (subErr) {
                error = Boom.wrap(subErr, 500);
            }
        }

        // Set defaults
        let status = Boom.notAcceptable().output.statusCode;
        let headers = {};
        let body = Boom.notAcceptable().toString();

        // Check for dev and include stacktrace
        if (error.output.statusCode >= 500 && ctx.app.env === 'development') {
            error.output.payload.stack = (error.stack && error.stack.split) ? error.stack.split('\n') : error.stack;
        }

        // Convert boom response to proper format
        error.output.payload = {
            error: {
                code: error.output.payload.code || '',
                status: error.output.payload.statusCode,
                message: error.output.payload.message,
                errors: error.output.payload.errors,
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
            headers = error.output.headers;
            body = error.output.payload;
        } else if (format === 'text') {
            status = error.output.statusCode;
            headers = error.output.headers;
            body = JSON.stringify(error.output.payload, null, 2);
        }

        // Emit the error
        ctx.request.err = err; // eslint-disable-line no-param-reassign
        ctx.send(body, status, headers);
        if (ctx.status >= 500) ctx.app.emit('error', err, ctx);
    }
};
