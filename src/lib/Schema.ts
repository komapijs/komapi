// Dependencies
import Ajv from 'ajv';
import Boom, { badRequest } from 'boom';
import pick from 'lodash.pick';

// Types
interface ValidationErrorPayload extends Boom.Payload {
  errors: object[];
}

// Init
const defaultConfig: Ajv.Options = {
  allErrors: true,
  verbose: true,
  messages: true,
  jsonPointers: true,
  useDefaults: true,
  format: 'full',
  removeAdditional: true,
  coerceTypes: false,
  ownProperties: true,
  errorDataPath: 'property',
};

// Exports
export default class Schema extends Ajv {
  public static createValidationError = (
    options: {
      schema?: object;
      errors?: Ajv.ErrorObject[] | null;
      message?: string;
      data?: object;
    } = {},
  ): Boom => {
    const { schema, data, errors, message } = options;
    const msg = message || (data ? 'Invalid data provided' : 'No data provided');
    const keys = ['dataPath', 'message', 'keyword', 'allowedValues'];
    const sanitizedErrors = (errors || []).map(error => pick(error, keys));
    const boomError = badRequest(msg, {
      schema,
      validatedData: data,
      errors: sanitizedErrors,
    });
    (boomError.output.payload as ValidationErrorPayload).errors = sanitizedErrors;
    return boomError;
  };
  constructor(config?: Ajv.Options) {
    super(Object.assign({}, defaultConfig, config));
  }
  public createValidator(jsonSchema: object, message?: string): <T extends object>(data: T) => T {
    const validator = this.compile(jsonSchema);
    return <T extends object>(data: T): T => {
      const isValid = validator(data);
      if (!isValid)
        throw Schema.createValidationError({
          message,
          data,
          schema: jsonSchema,
          errors: validator.errors,
        });
      return data;
    };
  }
}
