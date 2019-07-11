import { BadRequest, VError } from 'botched';
import ensureSchema, { createEnsureSchema } from '../../../src/lib/ensureSchema';

// Init
const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  required: ['someBool', 'someString'],
  type: 'object',
  properties: {
    someBool: { type: 'boolean' },
    someString: { type: 'string' },
    someStringWithDefaults: { type: 'string', default: 'Hello World!' },
    someISODate: { type: 'string', format: 'date-time' },
  },
};

// Tests
describe('ensureSchema', () => {
  it('should have sane defaults', () => {
    const ISODateString = new Date().toISOString();
    const data = {
      someBool: true,
      someOtherBool: false,
      someString: 'a string',
      someISODate: ISODateString,
    };
    const out = ensureSchema(schema, data);

    // Assertions
    expect(out).toEqual({
      someBool: true,
      someString: 'a string',
      someStringWithDefaults: 'Hello World!',
      someISODate: ISODateString,
    });
  });
  it('should throw MultiError with detailed validation errors', () => {
    const data = {
      someBool: 'string',
      someISODate: 'fail',
    };
    let error!: VError.MultiError;

    // Assertions
    expect(() => {
      try {
        ensureSchema(schema, data);
      } catch (err) {
        error = err;
        throw err;
      }
    }).toThrow(VError.MultiError);
    expect(error.errors()).toHaveLength(3);
    expect(error.errors()).toEqual(
      expect.arrayContaining([expect.any(BadRequest), expect.any(BadRequest), expect.any(BadRequest)]),
    );
    expect((error.errors() as BadRequest[]).map(err => err.toJSON())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: 'should be boolean',
          source: {
            pointer: '/someBool',
          },
          meta: {
            type: 'boolean',
          },
        }),
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: "should have required property 'someString'",
          source: {
            pointer: '',
          },
          meta: {
            missingProperty: 'someString',
          },
        }),
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: 'should match format "date-time"',
          source: {
            pointer: '/someISODate',
          },
          meta: {
            format: 'date-time',
          },
        }),
      ]),
    );
  });
  it('should throw MultiError if data was not provided', () => {
    let error!: VError.MultiError;

    // Assertions
    expect(() => {
      try {
        ensureSchema(schema, undefined);
      } catch (err) {
        error = err;
        throw err;
      }
    }).toThrow(VError.MultiError);
    expect(error.errors()).toHaveLength(1);
    expect(error.errors()).toEqual(expect.arrayContaining([expect.any(BadRequest)]));
    expect((error.errors() as BadRequest[]).map(err => err.toJSON())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'No data',
          detail: 'should be object',
          source: {
            pointer: '',
          },
          meta: {
            type: 'object',
          },
        }),
      ]),
    );
  });
});
describe('createEnsureSchema', () => {
  it('should return a schemaValidator', () => {
    const ISODateString = new Date().toISOString();
    const data = {
      someBool: true,
      someOtherBool: false,
      someString: 'a string',
      someISODate: ISODateString,
    };
    const validator = createEnsureSchema(schema);
    const out = validator(data);

    // Assertions
    expect(out).toEqual({
      someBool: true,
      someString: 'a string',
      someStringWithDefaults: 'Hello World!',
      someISODate: ISODateString,
    });
  });
  it('should throw MultiError with detailed validation errors', () => {
    const data = {
      someBool: 'string',
      someISODate: 'fail',
    };
    const validator = createEnsureSchema(schema);
    let error!: VError.MultiError;

    // Assertions
    expect(() => {
      try {
        validator(data);
      } catch (err) {
        error = err;
        throw err;
      }
    }).toThrow(VError.MultiError);
    expect(error.errors()).toHaveLength(3);
    expect(error.errors()).toEqual(
      expect.arrayContaining([expect.any(BadRequest), expect.any(BadRequest), expect.any(BadRequest)]),
    );
    expect((error.errors() as BadRequest[]).map(err => err.toJSON())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: 'should be boolean',
          source: {
            pointer: '/someBool',
          },
          meta: {
            type: 'boolean',
          },
        }),
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: "should have required property 'someString'",
          source: {
            pointer: '',
          },
          meta: {
            missingProperty: 'someString',
          },
        }),
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'Invalid data',
          detail: 'should match format "date-time"',
          source: {
            pointer: '/someISODate',
          },
          meta: {
            format: 'date-time',
          },
        }),
      ]),
    );
  });
  it('should throw MultiError if data was not provided', () => {
    const validator = createEnsureSchema(schema);
    let error!: VError.MultiError;

    // Assertions
    expect(() => {
      try {
        validator(undefined);
      } catch (err) {
        error = err;
        throw err;
      }
    }).toThrow(VError.MultiError);
    expect(error.errors()).toHaveLength(1);
    expect(error.errors()).toEqual(expect.arrayContaining([expect.any(BadRequest)]));
    expect((error.errors() as BadRequest[]).map(err => err.toJSON())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: '400',
          code: 'ValidationError',
          title: 'No data',
          detail: 'should be object',
          source: {
            pointer: '',
          },
          meta: {
            type: 'object',
          },
        }),
      ]),
    );
  });
});
