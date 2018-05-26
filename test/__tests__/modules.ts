// Dependencies
import sanitizeSource from '../../src/lib/sanitize';
import SchemaSource from '../../src/lib/Schema';
import serializeRequestSource from '../../src/lib/serializeRequest';
import serializeResponseSource from '../../src/lib/serializeResponse';
import ensureSchemaSource from '../../src/middlewares/ensureSchema';
import errorHandlerSource from '../../src/middlewares/errorHandler';
import requestLoggerSource from '../../src/middlewares/requestLogger';
import {
  ensureSchema,
  errorHandler,
  requestLogger,
  sanitize,
  Schema,
  serializeRequest,
  serializeResponse,
} from '../../src/modules';

// Tests
it('should have named exports', () => {
  // Assertions
  expect(sanitizeSource).toBe(sanitize);
  expect(SchemaSource).toBe(Schema);
  expect(serializeRequestSource).toBe(serializeRequest);
  expect(serializeResponseSource).toBe(serializeResponse);
  expect(ensureSchemaSource).toBe(ensureSchema);
  expect(errorHandlerSource).toBe(errorHandler);
  expect(requestLoggerSource).toBe(requestLogger);
});
