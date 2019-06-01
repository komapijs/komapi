// Imports
import Komapi from '../../fixtures/Komapi';
import Service from '../../../src/lib/Service';

// tslint:disable max-classes-per-file // We create some inline classes for convenience during tests

// Tests
describe('instantiation', () => {
  it('should set app in `service.app`', () => {
    const app = new Komapi();
    const service = new Service(app);

    // Assertions
    expect(service.app).toBe(app);
    expect(app.lifecycleHandlers).toHaveLength(0);
  });
  it('should automatically register a lifecycle handler if `service.start()` exists', () => {
    const app = new Komapi();

    // Create service class with lifecycle handlers
    class MyService extends Service {
      // eslint-disable-next-line
      public async start() {}
    }

    // Init service
    // eslint-disable-next-line
    new MyService(app);

    // Assertions
    expect(app.lifecycleHandlers).toHaveLength(1);
  });
  it('should automatically register a lifecycle handler if `service.stop()` exists', () => {
    const app = new Komapi();

    // Create service class with lifecycle handlers
    class MyService extends Service {
      // eslint-disable-next-line
      public async stop() {}
    }

    // Init service
    // eslint-disable-next-line
    new MyService(app);

    // Assertions
    expect(app.lifecycleHandlers).toHaveLength(1);
  });
  it('should automatically register a lifecycle handler if both `service.start()` and `service.stop()` exists', () => {
    const app = new Komapi();

    // Create service class with lifecycle handlers
    class MyService extends Service {
      // eslint-disable-next-line
      public async start() {}
      // eslint-disable-next-line
      public async stop() {}
    }

    // Init service
    // eslint-disable-next-line
    new MyService(app);

    // Assertions
    expect(app.lifecycleHandlers).toHaveLength(1);
  });
});
