// Dependencies
import Ajv from 'ajv';
import Boom, { badRequest } from 'boom';
import { pick } from 'lodash';

// Types
interface ValidationErrorPayload extends Boom.Payload {
  errors?: object[];
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
};

// Exports
export default class Schema extends Ajv {
  public static createValidationError = (
    options: {
      schema?: object;
      errors?: Ajv.ErrorObject[];
      message?: string;
      data?: object;
    } = {},
  ): Boom => {
    const { schema, data, errors, message } = options;
    const msg = message || (data ? 'Invalid data provided' : 'No data provided');
    const keys = ['keyword', 'message', 'dataPath', 'data', 'allowedValues'];
    const sanitizedErrors = (errors || []).map(error => pick(error, keys));
    const boomError = badRequest(msg, {
      schema,
      errors: sanitizedErrors,
    });
    (boomError.output.payload as ValidationErrorPayload).errors = sanitizedErrors;
    return boomError;
  };
  constructor(config?: Ajv.Options) {
    super(Object.assign({}, defaultConfig, config));
  }
  public createValidator(jsonSchema: object, message?: string): <T>(data: T) => T {
    const validate = this.compile(jsonSchema);
    return <T>(data: T): T => {
      const isValid = validate(data);
      if (!isValid) throw Schema.createValidationError({ message, data, schema: jsonSchema, errors: this.errors });
      return data;
    };
  }
}
