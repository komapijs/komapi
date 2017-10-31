// Dependencies
import validateConfig from '../lib/config';
import Schema from '../modules/json-schema/Schema';

// Init
const schema = new Schema({
  useDefaults: true,
  coerceTypes: true,
});
const configSchema = Joi => Joi.object({
  key: Joi.alternatives().try(Joi.any().valid(['body', 'params', 'query']), Joi.func()).default('body'),
  sendSchema: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.func().arity(1), Joi.any().valid(false),
  ).default('$schema'),
});

// Exports
/**
 * Middleware to ensure a request adheres to a predefined json schema
 *
 * @param {Object} jsonSchema - Json schema to enforce
 * @param {Object=} opts - Schema to use for validation
 * @param {string<body|params|query>|function} [opts.key=body] - Which key in the request object should be validated?
 * @param {function|string} [opts.sendSchema=] - Should we send the schema as response? Either a function returning true or false to evaluate (on ctx) if schema should be sent, or a query name to listen on GET requests
 * @returns {Object} - Returns the valid configuration with defaults applied if applicable
 */
export default function ensureSchema(jsonSchema, opts = {}) {
  const config = validateConfig(opts, configSchema);
  const validate = schema.compile(jsonSchema);
  return async function ensureSchemaMiddleware(ctx, next) {
    if (config.sendSchema) {
      if (typeof config.sendSchema === 'function' && config.sendSchema(ctx)) return ctx.send(jsonSchema);
      else if (ctx.request.method === 'GET'
        && ctx.request.query[config.sendSchema] !== undefined
        && ctx.request.query[config.sendSchema] !== 'false') return ctx.send(jsonSchema);
    }
    const data = typeof config.key === 'function' ? config.key(ctx) : ctx.request[config.key];
    const valid = await validate(data);
    if (!valid) throw Schema.validationError(validate.errors, jsonSchema, undefined, ctx.request[config.key]);
    return next();
  };
}
