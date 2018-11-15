// Imports
import Komapi from '../../../src/lib/Komapi';
import Service from '../../../src/lib/Service';

// Tests
it('should expose a standard interface', async done => {
  expect.assertions(5);
  const app = new Komapi();
  const service = new Service(app);

  // Assertions
  expect(service.app).toBe(app);
  expect(typeof service.init).toBe('function');
  expect(typeof service.close).toBe('function');

  const initResult = await service.init(app);
  const closeResult = await service.close(app);
  expect(initResult).toBe(undefined);
  expect(closeResult).toBe(undefined);

  // Done
  done();
});
