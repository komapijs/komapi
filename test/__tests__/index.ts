// Dependencies
import ApplicationSource from '../../src/lib/Komapi';
import Application from '../../src/index';

// Tests
it('should have Komapi as default export', () => {
  // Assertions
  expect(ApplicationSource).toBe(Application);
});
