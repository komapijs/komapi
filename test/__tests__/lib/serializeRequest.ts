// Mocks
jest.mock('../../../src/lib/sanitize', () => jest.fn().mockImplementation(input => input));

// Dependencies
import requestSerializer from '../../../src/lib/serializeRequest';
import sanitize from '../../../src/lib/sanitize';
import mockRequest from '../../fixtures/mockRequest';

// Tests
it('should not include body for successful requests', () => {
  const { request } = mockRequest({
    query: {
      sort: '+created_at',
    },
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedRequest = {
    headers: {
      'cache-control': 'no-cache',
    },
    query: {
      sort: '+created_at',
    },
    body: undefined,
  };

  // Assertions
  expect(requestSerializer(request)).toEqual(expectedRequest);
});
it('should include body for internal server errors', () => {
  const { request } = mockRequest(
    {
      query: {
        sort: '+created_at',
      },
      body: {
        test: true,
        withString: 'string',
      },
    },
    { status: 500 },
  );
  const expectedRequest = {
    headers: {
      'cache-control': 'no-cache',
    },
    query: {
      sort: '+created_at',
    },
    body: {
      test: true,
      withString: 'string',
    },
  };

  // Assertions
  expect(requestSerializer(request)).toEqual(expectedRequest);
});
it('should sanitize potential sensitive information', () => {
  // Setup mocking
  (sanitize as jest.Mock).mockClear();

  // Init
  const { request } = mockRequest(
    {
      header: {
        authorization: 'Basic YWRtaW46c2VjcmV0',
      },
      query: {
        token: 'secret',
        sort: '+created_at',
      },
      body: {
        test: true,
        withString: 'string',
        password: 'hunter2',
      },
    },
    { status: 500 },
  );
  const expectedRequest = {
    headers: {
      authorization: 'Basic ****',
      'cache-control': 'no-cache',
    },
    query: {
      token: 'secret',
      sort: '+created_at',
    },
    body: {
      test: true,
      withString: 'string',
      password: 'hunter2',
    },
  };

  // Assertions
  const serializedRequest = requestSerializer(request);
  expect(serializedRequest).toEqual(expectedRequest);
  expect(sanitize).toHaveBeenCalledTimes(2);
  expect(sanitize).toHaveBeenCalledWith(request.query);
  expect(sanitize).toHaveBeenCalledWith(request.body);
});
