'use strict';

// Dependencies
import Ajv from 'ajv';
import _ from 'lodash';
import moment from 'moment';
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
            formats: {'date-time': (v) => moment(v, moment.ISO_8601, true).isValid()},
            messages: true,
            jsonPointers: true,
            format: 'full'
        }, opts));
    }
    static parseValidationErrors(errors, schema, message, data) {
        message = message || ((data) ? 'Invalid data provided' : 'No data provided');
        let err = new SchemaValidationError(message);
        err.schema = schema;
        err.errors = (data) ? errors.map(this._getDescriptiveError) : null;
        return err;
    }
    static _getDescriptiveError(error) {
        let descriptiveError = {
            path: error.dataPath,
            keyword: error.keyword,
            message: error.message,
            data: error.data
        };
        const mapping = {
            enum: (e, out) => {
                out.allowedValues = e.schema;
                return out;
            },
            required: (e, out) => {
                out.path += `/${e.params.missingProperty}`;
                out.message = 'should be present';
                out.data = null;
                return out;
            }
        };
        if (mapping[error.keyword]) descriptiveError = mapping[error.keyword](error, descriptiveError);
        descriptiveError.metadata = error;
        return descriptiveError;
    }
}
export function applySchema(schema, data, message){
    message = message || 'Invalid ' + schema + ' provided';
    const result = Joi.validate(data, schemas[schema]);
    if (result.error) throw new SchemaValidationError(message + ': ' + result.error.annotate());
    return result.value;
}