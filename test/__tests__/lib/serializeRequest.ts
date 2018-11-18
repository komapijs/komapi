// Imports
import serializeRequest from '../../../src/lib/serializeRequest';
import mockRequest from '../../fixtures/mockRequest';

// Tests
it('should not include body for successful requests', () => {
  const { request } = mockRequest({
    startAt: Date.now(),
    query: {
      sort: '+created_at',
    },
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedRequest = {
    startAt: expect.any(Number),
    body: undefined,
    header: { 'cache-control': 'no-cache' },
    httpVersion: undefined,
    ip: undefined,
    method: undefined,
    protocol: undefined,
    query: { sort: '+created_at' },
    referrer: undefined,
    requestId: undefined,
    trailers: undefined,
    url: undefined,
    userAgent: undefined,
  };

  // Assertions
  expect(serializeRequest()(request)).toEqual(expectedRequest);
});

it('should support options for determining whether to include body', () => {
  const { request } = mockRequest({
    startAt: Date.now(),
    query: {
      sort: '+created_at',
    },
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedRequest = {
    startAt: expect.any(Number),
    body: { test: true, withString: 'string' },
    header: { 'cache-control': 'no-cache' },
    httpVersion: undefined,
    ip: undefined,
    method: undefined,
    protocol: undefined,
    query: { sort: '+created_at' },
    referrer: undefined,
    requestId: undefined,
    trailers: undefined,
    url: undefined,
    userAgent: undefined,
  };

  // Assertions
  expect(serializeRequest({ includeBody: true })(request)).toEqual(expectedRequest);
});
it('should not include body for not found', () => {
  const { request } = mockRequest(
    {
      startAt: Date.now(),
      query: {
        sort: '+created_at',
      },
      body: {
        test: true,
        withString: 'string',
      },
    },
    { status: 404 },
  );
  const expectedRequest = {
    startAt: expect.any(Number),
    body: undefined,
    header: { 'cache-control': 'no-cache' },
    httpVersion: undefined,
    ip: undefined,
    method: undefined,
    protocol: undefined,
    query: { sort: '+created_at' },
    referrer: undefined,
    requestId: undefined,
    trailers: undefined,
    url: undefined,
    userAgent: undefined,
  };

  // Assertions
  expect(serializeRequest()(request)).toEqual(expectedRequest);
});
it('should include body for bad requests', () => {
  const { request } = mockRequest(
    {
      startAt: Date.now(),
      query: {
        sort: '+created_at',
      },
      body: {
        test: true,
        withString: 'string',
      },
    },
    { status: 400 },
  );
  const expectedRequest = {
    startAt: expect.any(Number),
    body: { test: true, withString: 'string' },
    header: { 'cache-control': 'no-cache' },
    httpVersion: undefined,
    ip: undefined,
    method: undefined,
    protocol: undefined,
    query: { sort: '+created_at' },
    referrer: undefined,
    requestId: undefined,
    trailers: undefined,
    url: undefined,
    userAgent: undefined,
  };

  // Assertions
  expect(serializeRequest()(request)).toEqual(expectedRequest);
});
it('should include body for internal server errors', () => {
  const { request } = mockRequest(
    {
      startAt: Date.now(),
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
    startAt: expect.any(Number),
    body: { test: true, withString: 'string' },
    header: { 'cache-control': 'no-cache' },
    httpVersion: undefined,
    ip: undefined,
    method: undefined,
    protocol: undefined,
    query: { sort: '+created_at' },
    referrer: undefined,
    requestId: undefined,
    trailers: undefined,
    url: undefined,
    userAgent: undefined,
  };

  // Assertions
  expect(serializeRequest()(request)).toEqual(expectedRequest);
});
