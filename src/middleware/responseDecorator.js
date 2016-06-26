'use strict';

// Exports
export default () => {
    return async function responseDecorator(ctx, next) {
        await next();
        return ctx.set('X-Request-ID', ctx.request.reqId);
    };
};