// Dependencies
import Schema from './Schema';
import cloneDeep from 'lodash.clonedeep';

// Init
const schema = new Schema();

// Exports
export default function ensureModel<T extends object = object>(
  jsonSchema: object,
  data: T | any,
  message: string = 'Invalid data provided',
): T {
  const safeProps = cloneDeep(data);
  const isValid = schema.validate(jsonSchema, safeProps);
  if (!isValid) {
    throw Schema.createValidationError({
      data,
      message,
      schema: jsonSchema,
      errors: schema.errors,
    });
  }
  return safeProps;
}
