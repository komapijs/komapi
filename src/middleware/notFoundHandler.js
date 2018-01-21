// Dependencies
import { notFound } from 'boom';

// Exports
export default () => async function notFoundHandler(ctx, next) {
  await next();
  if (ctx.status === 404) throw notFound();
};
