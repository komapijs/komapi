// Imports
import Komapi from '../../../../src/lib/Komapi';

// Tests
it('should start in `STOPPED` state', () => {
  const app = new Komapi();

  // Assertions
  expect(app.state).toBe('STOPPED');
});
it('should provide `app.start()` and `app.stop()` methods', async (done) => {
  expect.assertions(2);
  const app = new Komapi();

  // Assertions
  expect(typeof app.start).toBe('function');
  expect(typeof app.stop).toBe('function');

  // Done
  done();
});
it('should transition from STOPPED to STARTING => STARTED state and run handlers', async (done) => {
  expect.assertions(6);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStart(() => {
    expect(counter).toBe(2);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(0);
    counter += 1;
  });

  // Assert initial state
  expect(app.state).toBe('STOPPED');

  // Start application
  const p = app.start();

  // Check starting state
  expect(app.state).toBe('STARTING');

  // Let application start
  await p;

  // Assert ending state
  expect(app.state).toBe('STARTED');

  // Done
  done();
});
it('should allow `app.start()` while in STARTING state and not re-run handlers', async (done) => {
  expect.assertions(7);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStart(() => {
    expect(counter).toBe(2);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(0);
    counter += 1;
  });

  // Assert initial state
  expect(app.state).toBe('STOPPED');

  // Start application
  app.start();

  // Check starting state
  expect(app.state).toBe('STARTING');
  const p2 = app.start();
  expect(app.state).toBe('STARTING');

  // Let application start
  await p2;

  // Assert ending state
  expect(app.state).toBe('STARTED');

  // Done
  done();
});
it('should allow `app.start()` while in STARTED state and not re-run handlers', async (done) => {
  expect.assertions(5);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStart(() => {
    expect(counter).toBe(2);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onBeforeStart(() => {
    expect(counter).toBe(0);
    counter += 1;
  });

  // Assert initial state
  expect(app.state).toBe('STOPPED');

  // Start application
  await app.start();

  // Check starting state
  expect(app.state).toBe('STARTED');
  await app.start();

  // Done
  done();
});
it('should transition from STARTED to STOPPING => STOPPED state and run handlers', async (done) => {
  expect.assertions(6);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStop(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onStop(() => {
    expect(counter).toBe(0);
    counter += 1;
  });
  app.onAfterStop(() => {
    expect(counter).toBe(2);
    counter += 1;
  });

  // Prepare
  await app.start();

  // Assert initial state
  expect(app.state).toBe('STARTED');

  // Start application
  const p = app.stop();

  // Check starting state
  expect(app.state).toBe('STOPPING');

  // Let application start
  await p;

  // Assert ending state
  expect(app.state).toBe('STOPPED');

  // Done
  done();
});
it('should allow `app.stop()` while in STOPPING state and not re-run handlers', async (done) => {
  expect.assertions(7);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStop(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onStop(() => {
    expect(counter).toBe(0);
    counter += 1;
  });
  app.onAfterStop(() => {
    expect(counter).toBe(2);
    counter += 1;
  });

  // Prepare
  await app.start();

  // Assert initial state
  expect(app.state).toBe('STARTED');

  // Start application
  app.stop();

  // Check starting state
  expect(app.state).toBe('STOPPING');
  const p2 = app.stop();
  expect(app.state).toBe('STOPPING');

  // Let application start
  await p2;

  // Assert ending state
  expect(app.state).toBe('STOPPED');

  // Done
  done();
});
it('should allow `app.stop()` while in STOPPED state and not re-run handlers', async (done) => {
  expect.assertions(5);
  const app = new Komapi();
  let counter = 0;

  // Add handlers
  app.onStop(() => {
    expect(counter).toBe(1);
    counter += 1;
  });
  app.onStop(() => {
    expect(counter).toBe(0);
    counter += 1;
  });
  app.onAfterStop(() => {
    expect(counter).toBe(2);
    counter += 1;
  });

  // Prepare
  await app.start();

  // Assert initial state
  expect(app.state).toBe('STARTED');

  // Start application
  await app.stop();

  // Check starting state
  expect(app.state).toBe('STOPPED');
  await app.stop();

  // Done
  done();
});
