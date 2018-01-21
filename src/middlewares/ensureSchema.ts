// Dependencies
import Koa from 'koa';
import Schema from '../lib/Schema';

// Init
const schema = new Schema();

// Exports
export default function ensureSchemaMiddlewareFactory(
  jsonSchema: object,
  getData: (ctx: Koa.Context) => object = ctx => (ctx.request as any).body,
): Koa.Middleware {
  const validate = schema.createValidator(jsonSchema);
  return async function ensureSchemaMiddleware(ctx, next) {
    const data = getData(ctx);
    await validate(data);
    return next();
  };
}
