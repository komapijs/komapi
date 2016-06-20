'use strict';

// Dependencies
import Joi from 'joi';

// Init
let schemas = {};

// Define schemas
schemas.config = Joi.object({
    env: Joi.any().valid(['development', 'production']).required(),
    loggers: Joi.array().items(Joi.object({
        name: Joi.string().required()
    }).unknown()).required(),
    name: Joi.string().min(1).required(),
    proxy: Joi.boolean().required(),
    routePrefix: Joi.string().min(1).required(),
    subdomainOffset: Joi.number().min(0).required()
});
schemas.requestLogger = Joi.object({
    logger: Joi.func().optional()
});

// Exports
export default class Schema {
    static apply(schema, options, message){

        // Init
        message = message || 'Invalid ' + schema + ' provided';
        const result = Joi.validate(options, schemas[schema]);

        // Check for valid schema
        if (result.error) throw new Error(message + ': ' + result.error.annotate());

        return result.value;
    }
}