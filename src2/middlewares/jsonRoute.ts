// Dependencies
import Koa from 'koa';
import Komapi from '../lib/Komapi';
import { internal } from 'boom';
import Schema from '../lib/Schema';

// @ts-ignore
import fastJson from 'fast-json-stringify';

// Init
const schema = new Schema();

// Exports
export default function jsonRouteFactory<output extends object>(
  jsonSchema: object,
  handler: (ctx: Koa.Context, next: () => Promise<any>) => output | null,
): Komapi.Middleware {
  const validate = schema.createValidator(jsonSchema);
  const fast = fastJson(jsonSchema);
  return async function jsonRoute(ctx, next) {
    const handlerOutput = await handler(ctx, next);
    if (handlerOutput) {
      try {
        // ctx.body = validate(handlerOutput);
        // ctx.body = fast(handlerOutput);
        ctx.respond = false;
        const asd = fast(handlerOutput);
        ctx.res.statusCode = 200;
        ctx.res.setHeader('Content-Length', asd.length);
        ctx.res.setHeader('Content-Type', 'application/json');
        ctx.res.end(asd);
      } catch (err) {
        const newErr = internal(err.output.payload.message);
        newErr.data = err.data;
        throw newErr;
      }
    } else {
      ctx.body = null;
    }
  };
}

//
