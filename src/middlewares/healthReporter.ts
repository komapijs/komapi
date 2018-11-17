// Dependencies
import Komapi from '../lib/Komapi';

// Exports
export default function healthReporterMiddlewareFactory(path = '/.well_known/_health'): Komapi.Middleware {
  return async function healthReporterMiddleware(ctx, next) {
    if (ctx.path !== path) return next();

    // See https://tools.ietf.org/html/draft-inadarei-api-health-check-02 for more information
    ctx.set('Content-Type', 'application/health+json');

    // Check if application is ready
    if (ctx.app.state !== Komapi.Lifecycle.READY) {
      ctx.status = 503;
      ctx.body = {
        status: 'fail',
        output:
          ctx.app.state === Komapi.Lifecycle.SETUP || ctx.app.state === Komapi.Lifecycle.READYING
            ? 'Application is not ready'
            : ctx.app.state === Komapi.Lifecycle.CLOSING || ctx.app.state === Komapi.Lifecycle.CLOSED
            ? 'Application is shutting down'
            : undefined,
        serviceID: ctx.app.config.instanceId,
      };
    } else {
      ctx.body = {
        status: 'pass',
        serviceID: ctx.app.config.instanceId,
      };
    }
  };
}
