import Ajv, { ErrorObject } from 'ajv';
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

// Helpers
function createError<T>(errors: ErrorObject[], jsonSchema: object, data: T | any) {
  return new VError.MultiError(
    errors.map(err => {
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
    }),
  );
}

// Exports
export default function ensureSchema<T extends object = object>(jsonSchema: object, data: T | any): T {
  const safeProps = cloneDeep(data);
  const isValid = ajv.validate(jsonSchema, safeProps);
  if (!isValid) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    throw createError<T>(ajv.errors!, jsonSchema, data);
  }
  return safeProps;
}
export function createEnsureSchema<T extends object = object>(jsonSchema: object): (data: T | any) => T {
  const validate = ajv.compile(jsonSchema);
  return function ensureCompiledSchema(data: T | any): T {
    const safeProps = cloneDeep(data);
    const isValid = validate(safeProps);
    if (!isValid) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      throw createError<T>(validate.errors!, jsonSchema, data);
    }
    return safeProps;
  };
}
