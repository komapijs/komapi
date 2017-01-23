// Exports
export default () => async function responseDecorator(ctx, next) {
  await next();
  return ctx.set('X-Request-ID', ctx.request.reqId);
};
