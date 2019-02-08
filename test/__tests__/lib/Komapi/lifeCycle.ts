// Imports
import Komapi from '../../../../src/lib/Komapi';

// Tests
it('should provide `app.start()` and `app.stop()`', async () => {
  expect.assertions(2);
  const app = new Komapi();

  // Assertions
  expect(typeof app.start).toBe('function');
  expect(typeof app.stop).toBe('function');
});
