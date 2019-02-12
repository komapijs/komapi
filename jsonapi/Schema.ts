// Dependencies
import Ajv from 'ajv';

// Init
const defaultConfig: Ajv.Options = {
  allErrors: true,
  verbose: true,
  messages: true,
  jsonPointers: true,
  useDefaults: true,
  format: 'full',
  // removeAdditional: true,
  coerceTypes: false,
  ownProperties: true,
  errorDataPath: 'property',
  extendRefs: 'fail',
};

// Helpers
export class SchemaValidationError extends Error {
  public readonly data: object;
  public readonly jsonSchema: object;
  public readonly errors: Ajv.ErrorObject[] | null | undefined;

  /**
   * Create a Schema Validation error
   *
   * @param {{ message: string, errors: Ajv.ErrorObject[] | null | undefined, jsonSchema: object, data: object }} opts
   */
  constructor(opts: { message: string, errors: Ajv.ErrorObject[] | null | undefined, jsonSchema: object, data: object }) {
    super(opts.message);
    this.name = this.constructor.name;
    this.data = opts.data;
    this.errors = opts.errors;
    this.jsonSchema = opts.jsonSchema;
  }
}

// Exports
export default class Schema extends Ajv {
  /**
   * @override
   */
  constructor(config?: Ajv.Options) {
    super(Object.assign({}, defaultConfig, config));
  }
  public createValidator(jsonSchema: object): <T extends object>(data: T) => T {
    const validator = this.compile(jsonSchema);
    return <T extends object>(data: T): T => {
      const isValid = validator(data);
      if (!isValid) {
        throw new SchemaValidationError({
          jsonSchema,
          data,
          message: 'Schema validation failed',
          errors: validator.errors,
        })
      }
      return data;
    };
  }
}
