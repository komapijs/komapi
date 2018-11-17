// Dependencies
import Komapi from '../lib/Komapi';
import { serverUnavailable } from 'boom';

// Exports
export default function ensureReadyMiddlewareFactory(): Komapi.Middleware {
  return async function ensureReadyMiddleware(ctx, next) {
    if (ctx.app.state !== Komapi.Lifecycle.READY) {
      // Force initialization
      if (ctx.app.state === Komapi.Lifecycle.SETUP) {
        // Should run init outside of the request loop!
        ctx.log.warn(
          { app: ctx.app },
          `Application is in \`${
            Komapi.Lifecycle.SETUP
          }\` state. Invoking \`app.init()\` automatically before serving this request. It is highly recommended to run \`app.init()\` before accepting requests through e.g. \`app.listen()\``,
        );
        ctx.app.init();
      }
      // Is server rejecting new requests?
      else if (ctx.app.state === Komapi.Lifecycle.CLOSING || ctx.app.state === Komapi.Lifecycle.CLOSED) {
        const err = serverUnavailable('Application is closing');
        err.output.headers.Connection = 'close';
        throw err;
      }
      // Wait for ready state
      await ctx.app.waitForReadyState;
    }
    return next();
  };
}
