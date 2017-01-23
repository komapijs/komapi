// Dependencies
import test from 'ava';
import Schema from '../../../src/modules/json-schema/schema';

// Init
const testSchema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Test schema',
  type: 'object',
  required: [
    'name',
    'counter',
  ],
  properties: {
    name: {
      description: 'Name of person',
      type: 'string',
    },
    counter: {
      description: 'A counter starting',
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 1,
    },
    hasEmail: {
      description: 'Has email?',
      type: 'boolean',
      default: false,
    },
    at: {
      description: 'Current time',
      type: 'string',
      format: 'date-time',
    },
    secretValue: {
      description: 'Hidden value',
      type: 'string',
      message: 'invalid value',
      enum: [
        '1234',
      ],
    },
  },
};

// Tests
test('can give a descriptive error object', async (t) => {
  const schema = new Schema();
  const data = {
    name: 'Jeff Smith',
  };
  schema.validate(testSchema, data);
  const err = Schema.validationError(schema.errors, testSchema, 'A custom message', data);
  t.is(err.isBoom, true);
  t.is(err.output.payload.statusCode, 400);
  t.is(err.message, 'A custom message');
  t.deepEqual(err.output.payload.errors, [{
    path: '/counter',
    keyword: 'required',
    message: 'should be present',
    data: null,
  }]);
});
test('provides a descriptive default error message', async (t) => {
  const schema = new Schema();
  const data = {
    name: 'Jeff Smith',
  };
  schema.validate(testSchema, data);
  const err = Schema.validationError(schema.errors, testSchema, undefined, data);
  t.is(err.isBoom, true);
  t.is(err.message, 'Invalid data provided');
  t.is(err.output.payload.statusCode, 400);
  t.deepEqual(err.output.payload.errors, [{
    path: '/counter',
    keyword: 'required',
    message: 'should be present',
    data: null,
  }]);
});
test('provides a descriptive default error messages when no data was present', async (t) => {
  const schema = new Schema();
  const data = null;
  schema.validate(testSchema, data);
  const err = Schema.validationError(schema.errors, testSchema, undefined, data);
  t.is(err.isBoom, true);
  t.is(err.message, 'No data provided');
  t.is(err.output.payload.statusCode, 400);
  t.deepEqual(err.output.payload.errors, []);
});
test('can override the error message and hide enum values', async (t) => {
  const schema = new Schema();
  const data = {
    name: 'Jeff Smith',
    counter: 7,
    secretValue: '12345',
  };
  schema.validate(testSchema, data);
  const err = Schema.validationError(schema.errors, testSchema, undefined, data);
  t.is(err.isBoom, true);
  t.is(err.message, 'Invalid data provided');
  t.is(err.output.payload.statusCode, 400);
  t.deepEqual(err.output.payload.errors, [{
    path: '/secretValue',
    keyword: 'enum',
    message: 'invalid value',
    data: '12345',
    allowedValues: undefined,
  }]);
});
test('schema accepts ISO8601 date-time format', async (t) => {
  const schema = new Schema();
  const data = {
    name: 'Jeff Smith',
    counter: 7,
    at: '2016-09-23',
  };
  const valid = schema.validate(testSchema, data);
  t.is(valid, true);
});
test('schema rejects non-ISO8601 date-time format', async (t) => {
  const schema = new Schema();
  const data = {
    name: 'Jeff Smith',
    counter: 7,
    at: '2016/09/23',
  };
  const valid = schema.validate(testSchema, data);
  t.is(valid, false);
  const err = Schema.validationError(schema.errors, testSchema, 'A custom message', data);
  t.deepEqual(err.output.payload.errors, [
    {
      path: '/at',
      keyword: 'format',
      message: 'should match format "date-time"',
      data: '2016/09/23',
    },
  ]);
});
