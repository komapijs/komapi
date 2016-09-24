'use strict';

// Dependencies
import Boom from 'boom';
import _ from 'lodash';

// Exports
export default () => {
    return async function errorHandler(ctx, next) {
        try {
            await next();
            if (ctx.status >= 400) ctx.throw(ctx.status);
        } catch (err) {
            let error = err;

            // Unknown error?
            if (!err.isBoom) {
                try {
                    error = Boom.wrap(err, err.status || 500);
                } catch (err) {
                    error = Boom.wrap(err, 500);
                }
            }

            // Set status
            ctx.status = error.output.statusCode;

            // Check for dev and include stacktrace
            if (error.output.statusCode >= 500 && ctx.app.env === 'development') error.output.payload.stack = (error.stack && error.stack.split) ? error.stack.split('\n') : error.stack;

            // Convert boom response to proper format
            error.output.payload = {
                error: {
                    code: error.output.payload.code || '',
                    status: error.output.payload.statusCode,
                    message: error.output.payload.message,
                    errors: error.output.payload.errors,
                    stack: error.output.payload.stack
                }
            };

            // Respond with the proper format
            let format = ctx.accepts(['json', 'text']);
            if (format === 'json') {
                _.forOwn(error.output.headers, (val, key) => ctx.set(key, val));
                ctx.body = error.output.payload;
            }
            else if(format === 'text') {
                _.forOwn(error.output.headers, (val, key) => ctx.set(key, val));
                ctx.type = 'text';
                ctx.body = JSON.stringify(error.output.payload, null, 2);
            }
            else {
                ctx.status = 406;
                ctx.body = Boom.notAcceptable().toString();
            }

            // Emit the error
            ctx.request.err = err;
            if (ctx.status >= 500) ctx.app.emit('error', err, ctx);
        }
    };
};