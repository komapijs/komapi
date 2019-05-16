// Dependencies
import Ajv from 'ajv';
import cloneDeep from 'lodash.clonedeep';
import { BadRequest, VError } from 'botched';

// Init
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  jsonPointers: true,
  useDefaults: true,
  format: 'full',
  removeAdditional: true,
  coerceTypes: false,
  ownProperties: true,
});

// Exports
export default function ensureSchema<T extends object = object>(jsonSchema: object, data: T | any): T {
  const safeProps = cloneDeep(data);
  const isValid = ajv.validate(jsonSchema, safeProps);
  if (!isValid) {
    if (ajv.errors && ajv.errors.length > 0) {
      const errors = ajv.errors.map(err => {
        return new BadRequest(
          {
            code: 'ValidationError',
            title: data ? 'Invalid data' : 'No data',
            source: {
              pointer: err.dataPath,
            },
            meta: err.params,
          },
          err.message,
        );
      });

      // Throw all errors
      throw new VError.MultiError(errors as Error[]);
    }

    // Throw a generic error
    throw new BadRequest(
      {
        code: 'ValidationError',
        title: data ? 'Invalid data' : 'No data',
      },
      'Validation failed',
    );
  }
  return safeProps;
}
