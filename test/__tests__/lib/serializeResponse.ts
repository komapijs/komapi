// Mocks
jest.mock('../../../src/lib/sanitize', () => jest.fn().mockImplementation(input => input));

// Dependencies
import responseSerializer from '../../../src/lib/serializeResponse';
import sanitize from '../../../src/lib/sanitize';
import mockRequest from '../../fixtures/mockRequest';

// Tests
it('should not include body for successful requests', () => {
  const { response } = mockRequest(undefined, {
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedResponse = { body: undefined };

  // Assertions
  expect(responseSerializer()(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should include body for internal server errors', () => {
  const { response } = mockRequest(undefined, {
    status: 500,
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedResponse = {
    body: {
      test: true,
      withString: 'string',
    },
  };

  // Assertions
  expect(responseSerializer()(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should sanitize potential sensitive information', () => {
  // Setup mocking
  (sanitize as jest.Mock).mockClear();

  // Init
  const { response } = mockRequest(undefined, {
    status: 500,
    body: {
      test: true,
      withString: 'string',
      password: 'hunter2',
    },
  });
  const expectedResponse = {
    body: {
      test: true,
      withString: 'string',
      password: 'hunter2',
    },
  };

  // Assertions
  const serializedResponse = responseSerializer()(response);
  expect(serializedResponse).toEqual(expect.objectContaining(expectedResponse));
  expect(sanitize).toHaveBeenCalledTimes(1);
  expect(sanitize).toHaveBeenCalledWith(response.body);
});
