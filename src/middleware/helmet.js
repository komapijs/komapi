'use strict';

// Dependencies
import helmet from 'helmet';

// Exports
export default (options = {}) => {
    options.hidePoweredBy = false;
    return function security(ctx, next) {
        return new Promise((resolve, reject) => {
            helmet(options)(ctx.request, ctx.response, (err, res) => {
                if (err) return reject(err);
                return resolve(res);
            });
        }).then(next);
    };
};