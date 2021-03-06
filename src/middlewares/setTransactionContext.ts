import cls from 'cls-hooked';
import Komapi from '../lib/Komapi';

// Exports
export default function setTransactionContextMiddlewareFactory(transactionContext: cls.Namespace): Komapi.Middleware {
  return async function setTransactionContextMiddleware(ctx, next) {
    return new Promise(resolve => {
      transactionContext.run(() => {
        transactionContext.set('auth', ctx.auth);
        transactionContext.set('requestId', ctx.request.requestId);
        resolve(next());
      });
    });
  };
}
