// Dependencies
import Ajv from 'ajv';
import Boom, { badRequest } from 'boom';
import { pick } from 'lodash';

// Init
const defaultConfig: Ajv.Options = {
  allErrors: true,
  verbose: true,
  messages: true,
  jsonPointers: true,
  useDefaults: true,
  format: 'full',
};

// Exports
export const getDescriptiveError = (
  error: Ajv.ErrorObject,
): {
  path: Ajv.ErrorObject['dataPath'];
  keyword: Ajv.ErrorObject['keyword'];
  message: Ajv.ErrorObject['message'];
  data: Ajv.ErrorObject['data'];
} => ({
  path: error.dataPath,
  keyword: error.keyword,
  message: error.message,
  data: error.data,
});
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
    const keys = ['path', 'keyword', 'message', 'data', 'allowedValues'];
    const allErrors = data && errors ? errors.map(error => getDescriptiveError(error)) : [];
    const sanitizedErrors = allErrors.map(error => pick(error, keys));
    return badRequest(msg, {
      schema,
      errors: sanitizedErrors,
    });
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
