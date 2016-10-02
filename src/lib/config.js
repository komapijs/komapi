// Dependencies
import Joi from 'joi';

// Exports
export default function validate(data, schema, message) {
    const msg = message || 'Invalid config provided';
    const result = Joi.validate(data, schema(Joi));
    if (result.error) throw new Error(`${msg}: ${result.error.annotate()}`);
    return result.value;
}
