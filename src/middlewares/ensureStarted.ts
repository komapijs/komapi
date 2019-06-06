import Komapi from '../lib/Komapi';

// Exports
export default function createEnsureStarted(): Komapi.Middleware {
  return async function ensureStartedMiddleware(ctx, next) {
    if (ctx.app.state !== Komapi.LifecycleState.STARTED) {
      // Force start
      if (ctx.app.state === Komapi.LifecycleState.STOPPED) {
        // Should run start outside of the request loop!
        ctx.log.warn(
          { app: ctx.app },
          `Application is in \`${
            Komapi.LifecycleState.STOPPED
          }\` state. Invoking \`app.start()\` automatically before serving this request. It is highly recommended to run \`app.start()\` before accepting requests through e.g. \`app.listen()\``,
        );
      }
      // Is server rejecting new requests?
      else if (ctx.app.state === Komapi.LifecycleState.STOPPING) {
        // TODO: close connections: err.output.headers.Connection = 'close';
        throw new Error('Application is closing');
      }
      // Wait for ready state
      await ctx.app.start();
    }
    return next();
  };
}
