// Imports
import Komapi from '../../src/lib/Komapi';
import Service from '../../src/lib/Service';
import Schema from '../../src/lib/Schema';
import ensureModel from '../../src/lib/ensureModel';
import requestLogger from '../../src/middlewares/requestLogger';
import ensureSchema from '../../src/middlewares/ensureSchema';
import errorHandler from '../../src/middlewares/errorHandler';
import * as ModuleExports from '../../src/index';

// Tests
it('should have Komapi as default export', () => {
  // Assertions
  expect(ModuleExports.default).toBe(Komapi);
});
it('should export the Service base class', () => {
  // Assertions
  expect(ModuleExports.Service).toBe(Service);
});
it('should export the Schema base class', () => {
  // Assertions
  expect(ModuleExports.Schema).toBe(Schema);
});
it('should export the ensureModel utility function', () => {
  // Assertions
  expect(ModuleExports.ensureModel).toBe(ensureModel);
});
it('should export the requestLogger middleware', () => {
  // Assertions
  expect(ModuleExports.requestLogger).toBe(requestLogger);
});
it('should export the ensureSchema middleware', () => {
  // Assertions
  expect(ModuleExports.ensureSchema).toBe(ensureSchema);
});
it('should export the errorHandler middleware', () => {
  // Assertions
  expect(ModuleExports.errorHandler).toBe(errorHandler);
});
