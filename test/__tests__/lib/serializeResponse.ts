import serializeResponse from '../../../src/lib/serializeResponse';
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
  expect(serializeResponse()(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should support options for determining whether to include body', () => {
  const { response } = mockRequest(undefined, {
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
  expect(serializeResponse({ includeBody: true })(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should not include body for not found', () => {
  const { response } = mockRequest(undefined, {
    status: 404,
    body: {
      test: true,
      withString: 'string',
    },
  });
  const expectedResponse = { body: undefined };

  // Assertions
  expect(serializeResponse()(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should include body for bad requests', () => {
  const { response } = mockRequest(undefined, {
    status: 400,
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
  expect(serializeResponse()(response)).toEqual(expect.objectContaining(expectedResponse));
});
it('should include body for internal server error', () => {
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
  expect(serializeResponse()(response)).toEqual(expect.objectContaining(expectedResponse));
});
