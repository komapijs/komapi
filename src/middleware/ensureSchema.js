// Dependencies
import validateConfig from '../lib/config';
import Schema from '../modules/json-schema/schema';

// Init
const schema = new Schema({
    useDefaults: true,
    coerceTypes: true,
});
const configSchema = Joi => Joi.object({
    key: Joi.any().valid(['body', 'params', 'query']).default('body'),
    sendSchema: Joi.alternatives().try(
        Joi.string().min(1),
        Joi.func().arity(1), Joi.any().valid(false)
    ).default('$schema'),
});


// Exports
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
        const valid = await validate(ctx.request[config.key]);
        if (!valid) throw Schema.validationError(validate.errors, jsonSchema, undefined, ctx.request[config.key]);
        return next();
    };
}
