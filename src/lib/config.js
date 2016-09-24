'use strict';

// Dependencies
import Joi from 'joi';

// Exports
export default function validate(data, schema, message){
    message = message || 'Invalid config provided';
    const result = Joi.validate(data, schema(Joi));
    if (result.error) throw new Error(message + ': ' + result.error.annotate());
    return result.value;
}