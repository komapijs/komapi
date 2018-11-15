// Imports
import ensureModel from '../../../src/lib/ensureModel';

// Types
interface ExampleData {
  id: number;
}
const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  title: 'Example schema',
  required: ['id'],
  type: 'object',
  properties: {
    id: {
      description: 'Unique identifier',
      type: 'integer',
    },
  },
};

// Tests
it('should throw if data is invalid', () => {
  const originalData = {
    id: '12345678',
  };

  // Assertions
  expect(() => ensureModel<ExampleData>(jsonSchema, originalData)).toThrow('Invalid data provided');
});
it('should support custom error message', () => {
  const originalData = {
    id: '12345678',
  };

  // Assertions
  expect(() => ensureModel<ExampleData>(jsonSchema, originalData, 'my custom error message')).toThrow(
    'my custom error message',
  );
});
it('should automatically remove extra properties from valid data', () => {
  const originalData = {
    id: 12345678,
    name: 'Hello World',
  };
  const expectedData: ExampleData = {
    id: 12345678,
  };
  const processedData = ensureModel<ExampleData>(jsonSchema, originalData);

  // Assertions
  expect(processedData).toEqual(expectedData);
});
it('should not mutate original data', () => {
  const originalData = {
    id: 12345678,
    name: 'Hello World',
  };
  const originalDataCopy = {
    id: 12345678,
    name: 'Hello World',
  };
  const expectedData: ExampleData = {
    id: 12345678,
  };
  const processedData = ensureModel<ExampleData>(jsonSchema, originalData);

  // Assertions
  expect(processedData).not.toBe(originalData);
  expect(processedData).toEqual(expectedData);
  expect(originalData).toEqual(originalDataCopy);
});
