// Dependencies
import Komapi from '../lib/Komapi';
import cls from 'cls-hooked';

// Exports
export default function setTransactionContextMiddlewareFactory(transactionContext: cls.Namespace): Komapi.Middleware {
  return async function setTransactionContextMiddleware(ctx, next) {
    return new Promise(resolve => {
      transactionContext.run(() => {
        // TODO: transactionContext.set('auth', ctx.request.auth.isAuthenticated ? ctx.request.auth.account : null);
        transactionContext.set('requestId', ctx.request.requestId);
        resolve(next());
      });
    });
  };
}
