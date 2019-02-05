// Dependencies
import Komapi from '../lib/Komapi';
import cls from 'cls-hooked';

// Exports
export default function setTransactionContextMiddlewareFactory(transactionContext: cls.Namespace): Komapi.Middleware {
  return async function setTransactionContextMiddleware(ctx, next) {
    return new Promise(resolve => {
      transactionContext.run(() => {
        // @ts-ignore
        transactionContext.set('auth', ctx.auth);
        transactionContext.set('requestId', ctx.request.requestId);
        resolve(next());
      });
    });
  };
}
