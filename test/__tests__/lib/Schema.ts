// Imports
import Schema from '../../../src/lib/Schema';
import Boom from 'boom';

// Init
const exampleSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  title: 'Example schema',
  required: ['id', 'name', 'isCool'],
  type: 'object',
  properties: {
    id: {
      description: 'Unique identifier',
      type: 'integer',
    },
    name: {
      description: 'Name of a person',
      type: 'string',
    },
    isCool: {
      description: 'Is this person cool?',
      type: 'boolean',
    },
    comment: {
      description: 'Some comment about this person',
      type: 'string',
    },
  },
};
const exampleSchemaWithDefaults = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  title: 'Example schema',
  required: ['id', 'name', 'isCool'],
  type: 'object',
  properties: {
    id: {
      description: 'Unique identifier',
      type: 'integer',
    },
    name: {
      description: 'Name of a person',
      type: 'string',
    },
    isCool: {
      description: 'Is this person cool?',
      type: 'boolean',
    },
    hasHair: {
      description: 'Does this person have hair?',
      type: 'boolean',
      default: true,
    },
    comment: {
      description: 'Some comment about this person',
      type: 'string',
    },
  },
};

// Tests
describe('initialization', () => {
  it('should have sane defaults', () => {
    const schema = new Schema();
    const defaultOpts = {
      allErrors: true,
      verbose: true,
      messages: true,
      jsonPointers: true,
      useDefaults: true,
      format: 'full',
    };

    // Assertions
    expect((schema as any)._opts).toEqual(expect.objectContaining(defaultOpts));
  });
  it('should support overriding default options', () => {
    const schema = new Schema();
    const defaultOpts = {
      allErrors: true,
      verbose: true,
      messages: true,
      jsonPointers: true,
      useDefaults: true,
      format: 'full',
    };

    // Assertions
    expect((schema as any)._opts).toEqual(expect.objectContaining(defaultOpts));
  });
});
describe('helper methods', () => {
  describe('createValidationError', () => {
    it('should create a Boom.badRequest error object', () => {
      const error = Schema.createValidationError();
      const errorWithData = Schema.createValidationError({
        schema: exampleSchema,
        data: {
          id: 1,
          name: 'John Smith',
          comment: 'A long comment about this generic person',
        },
      });

      // Assertions
      expect(Boom.isBoom(error)).toBe(true);
      expect(error.message).toBe('No data provided');
      expect(error.data).toEqual({
        errors: [],
        schema: undefined,
      });
      expect(Boom.isBoom(errorWithData)).toBe(true);
      expect(errorWithData.message).toBe('Invalid data provided');
      expect(errorWithData.data).toEqual({
        errors: [],
        schema: exampleSchema,
        validatedData: {
          comment: 'A long comment about this generic person',
          id: 1,
          name: 'John Smith',
        },
      });
    });
    it('should pre populate output.payload.errors with sanitized error messages', () => {
      const error = Schema.createValidationError({
        schema: exampleSchema,
        data: {
          id: 1,
          name: 'John Smith',
          comment: 'A long comment about this generic person',
        },
        errors: [
          {
            keyword: 'keyword',
            dataPath: 'dataPath',
            schemaPath: 'schemaPath',
            params: 'params',
            propertyName: 'propertyName',
            message: 'message',
            schema: exampleSchema,
            parentSchema: {
              parent: true,
            },
            data: {
              id: 1,
              name: 'John Smith',
              comment: 'A long comment about this generic person',
            },
          },
        ],
      });

      // Assertions
      expect(Boom.isBoom(error)).toBe(true);
      expect(error.message).toBe('Invalid data provided');
      expect((error.output.payload as any).errors).toEqual([
        {
          dataPath: 'dataPath',
          keyword: 'keyword',
          message: 'message',
        },
      ]);
    });
    it('should give detailed error messages if provided', () => {
      const data = {
        id: 1,
        name: 'John Smith',
        comment: 'A long comment about this generic person',
      };
      const schema = new Schema();
      const isValid = schema.validate(exampleSchema, data);
      const error = Schema.createValidationError({
        data,
        schema: exampleSchema,
        errors: schema.errors,
        message: 'An error message',
      });

      // Assertions
      expect(isValid).toBe(false);
      expect(Boom.isBoom(error)).toBe(true);
      expect(error.message).toBe('An error message');
      expect(error.data).toEqual({
        errors: [
          {
            keyword: 'required',
            message: 'is a required property',
            dataPath: '/isCool',
          },
        ],
        schema: exampleSchema,
        validatedData: {
          comment: 'A long comment about this generic person',
          id: 1,
          name: 'John Smith',
        },
      });
    });
  });
  describe('createValidator', () => {
    it('should create a validator that parses data', () => {
      const schema = new Schema();
      const validator = schema.createValidator(exampleSchemaWithDefaults);
      const data = {
        id: 1,
        name: 'John Smith',
        isCool: false,
      };
      const expectedData = {
        id: 1,
        name: 'John Smith',
        isCool: false,
        hasHair: true,
      };
      const parsedData = validator(data);

      // Assertions
      expect(parsedData).toEqual(expectedData);
    });
    it('should create a validator that accepts valid data', () => {
      const schema = new Schema();
      const validator = schema.createValidator(exampleSchema);
      const data = {
        id: 1,
        name: 'John Smith',
        isCool: false,
        comment: 'A long comment about this generic person',
      };
      const parsedData = validator(data);

      // Assertions
      expect(parsedData).toEqual(data);
    });
    it('should create a validator that throws on invalid data', () => {
      const schema = new Schema();
      const validator = schema.createValidator(exampleSchema);
      const data = {
        id: 1,
        name: 'John Smith',
        comment: 'A long comment about this generic person',
      };

      // Assertions
      expect(() => validator(data)).toThrow('Invalid data provided');
    });
  });
});
