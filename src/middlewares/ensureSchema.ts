// Dependencies
import Koa from 'koa';
import Schema from '../lib/Schema';
import { defaultsDeep } from 'lodash';

// Init
const defaultOptions = {
  key: 'body',
  schemaValidator: new Schema(),
};

// Exports
export default function ensureSchemaMiddlewareFactory(
  jsonSchema: object,
  options?: {
    key: 'body' | 'params' | 'query';
    schemaValidator?: Schema;
  },
): Koa.Middleware {
  const opts = defaultsDeep({}, options, defaultOptions);
  const validate = opts.schemaValidator.createValidator(jsonSchema);
  return async function ensureSchemaMiddleware(ctx, next) {
    const data = (ctx.request as any)[opts.key];
    await validate(data);
    return next();
  };
}
