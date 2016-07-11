'use strict';

// Dependencies
import Ajv from 'ajv';
import _ from 'lodash';
import SchemaValidationError from './errors/schemaValidationError';
import Joi from 'joi';

// Define Joi schemas
let schemas = {};
schemas.komapi = Joi.object({
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
export default class Schema extends Ajv {
    constructor(opts) {
        super(_.defaultsDeep({
            allErrors: true,
            verbose: true,
            messages: true,
            jsonPointers: false
        }, opts));
    }
    static parseValidationErrors(errors, schema, message, data) {
        let messages = {};
        message = message || ((data) ? 'Invalid data provided' : 'No data provided');
        if (data) {
            errors.forEach((error) => {
                let descError = this._getDescriptiveError(error);
                _.set(messages, descError.dataPath, {
                    message: descError.message,
                    schemaPath: decodeURIComponent(error.schemaPath),
                    data: descError.data
                });
            });
        }
        let err = new SchemaValidationError(message);
        err.schema = schema;
        err.errors = messages;
        return err;
    }
    static _getDescriptiveError(error) {
        const mapping = {
            enum: (e) => {
                return {
                    dataPath: e.dataPath,
                    message: `${e.message} (${e.schema.join(', ')})`,
                    data: error.data
                };
            },
            required: (e) => {
                return {
                    dataPath: `${e.dataPath}.${e.params.missingProperty}`,
                    message: 'should be present',
                    data: error.data
                };
            }
        };
        if (mapping[error.keyword]) return mapping[error.keyword](error);
        return {
            dataPath: error.dataPath,
            message: error.message,
            data: error.data
        };
    }
}
export function applySchema(schema, data, message){
    message = message || 'Invalid ' + schema + ' provided';
    const result = Joi.validate(data, schemas[schema]);
    if (result.error) throw new SchemaValidationError(message + ': ' + result.error.annotate());
    return result.value;
}