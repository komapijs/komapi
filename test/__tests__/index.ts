// Imports
import Komapi from '../../src/lib/Komapi';
import Service from '../../src/lib/Service';
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
