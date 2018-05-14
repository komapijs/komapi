// Dependencies
import Koa from 'koa';
import Schema from '../lib/Schema';
import { defaultsDeep } from 'lodash';

// Init
const defaultOptions = {
  getData: (ctx: Koa.Context) => (ctx.request as any).body,
  schemaValidator: new Schema({ removeAdditional: true }),
};

// Exports
export default function ensureSchemaMiddlewareFactory<T>(
  jsonSchema: object,
  options?: {
    getData?: (ctx: Koa.Context) => object;
    schemaValidator?: Schema;
  },
): Koa.Middleware {
  const opts = defaultsDeep({}, options, defaultOptions);
  const validate = opts.schemaValidator.createValidator(jsonSchema);
  return async function ensureSchemaMiddleware(ctx, next) {
    const data = opts.getData(ctx);
    await validate(data);
    return next();
  };
}
