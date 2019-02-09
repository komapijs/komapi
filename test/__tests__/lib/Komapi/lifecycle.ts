// Imports
import Komapi from '../../../../src/lib/Komapi';

// State values
const STARTED = 'STARTED' as Komapi.LifecycleState.STARTED;
const STARTING = 'STARTING' as Komapi.LifecycleState.STARTING;
const STOPPED = 'STOPPED' as Komapi.LifecycleState.STOPPED;
const STOPPING = 'STOPPING' as Komapi.LifecycleState.STOPPING;

// Tests
it('should start in STOPPED state', () => {
  const app = new Komapi();

  // Assertions
  expect(app.state).toBe(STOPPED);
});
it('should provide `app.start()` and `app.stop()` methods', () => {
  const app = new Komapi();

  // Assertions
  expect(typeof app.start).toBe('function');
  expect(typeof app.stop).toBe('function');
});
describe('app.onStart()', () => {
  it('should add start handlers after existing start handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = () => {};
    const shouldBe2ndHandler = () => {};
    const shouldBe3rdHandler = () => {};
    const shouldBe4thHandler = () => {};

    // Add start handlers
    app.onStart(shouldBe1stHandler);
    app.onStart(shouldBe2ndHandler, shouldBe3rdHandler);
    app.onStart(shouldBe4thHandler);

    // Assertions
    expect((app as any).startHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
});
describe('app.onBeforeStart()', () => {
  it('should add start handlers before existing start handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = () => {};
    const shouldBe2ndHandler = () => {};
    const shouldBe3rdHandler = () => {};
    const shouldBe4thHandler = () => {};

    // Add start handlers
    app.onStart(shouldBe4thHandler);
    app.onBeforeStart(shouldBe2ndHandler, shouldBe3rdHandler);
    app.onBeforeStart(shouldBe1stHandler);

    // Assertions
    expect((app as any).startHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
});
describe('app.onStop()', () => {
  it('should add stop handlers before existing stop handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = () => {};
    const shouldBe2ndHandler = () => {};
    const shouldBe3rdHandler = () => {};
    const shouldBe4thHandler = () => {};

    // Add start handlers
    app.onStop(shouldBe4thHandler);
    app.onStop(shouldBe3rdHandler);
    app.onStop(shouldBe1stHandler, shouldBe2ndHandler);

    // Assertions
    expect((app as any).stopHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
});
describe('app.onAfterStop()', () => {
  it('should add stop handlers after existing stop handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = () => {};
    const shouldBe2ndHandler = () => {};
    const shouldBe3rdHandler = () => {};
    const shouldBe4thHandler = () => {};

    // Add start handlers
    app.onStop(shouldBe1stHandler);
    app.onAfterStop(shouldBe2ndHandler, shouldBe3rdHandler);
    app.onAfterStop(shouldBe4thHandler);

    // Assertions
    expect((app as any).stopHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
});
describe('app.start()', () => {
  it('should transition from STOPPED to STARTING => STARTED state and run handlers', async done => {
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
    expect(app.state).toBe(STOPPED);

    // Start application
    const p = app.start();

    // Check starting state
    expect(app.state).toBe(STARTING);

    // Let application start
    await p;

    // Assert ending state
    expect(app.state).toBe(STARTED);

    // Done
    done();
  });
  it('should allow `app.start()` while in STARTING state and not re-run handlers', async done => {
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
    expect(app.state).toBe(STOPPED);

    // Start application
    app.start();

    // Check starting state
    expect(app.state).toBe(STARTING);
    const p2 = app.start();
    expect(app.state).toBe(STARTING);

    // Let application start
    await p2;

    // Assert ending state
    expect(app.state).toBe(STARTED);

    // Done
    done();
  });
  it('should allow `app.start()` while in STARTED state and not re-run handlers', async done => {
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
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start();

    // Check starting state
    expect(app.state).toBe(STARTED);
    await app.start();

    // Done
    done();
  });
  it('should not allow `app.start()` while in STOPPING state', async done => {
    expect.assertions(2);
    const app = new Komapi();
    app.state = STOPPING;

    // Assert initial state
    expect(app.state).toBe(STOPPING);
    await expect(app.start()).rejects.toThrow('Cannot start application while in `STOPPING` state');

    // Done
    done();
  });
});
describe('app.stop()', () => {
  it('should transition from STARTED to STOPPING => STOPPED state and run handlers', async done => {
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
    expect(app.state).toBe(STARTED);

    // Start application
    const p = app.stop();

    // Check starting state
    expect(app.state).toBe(STOPPING);

    // Let application start
    await p;

    // Assert ending state
    expect(app.state).toBe(STOPPED);

    // Done
    done();
  });
  it('should allow `app.stop()` while in STOPPING state and not re-run handlers', async done => {
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
    expect(app.state).toBe(STARTED);

    // Start application
    app.stop();

    // Check starting state
    expect(app.state).toBe(STOPPING);
    const p2 = app.stop();
    expect(app.state).toBe(STOPPING);

    // Let application start
    await p2;

    // Assert ending state
    expect(app.state).toBe(STOPPED);

    // Done
    done();
  });
  it('should allow `app.stop()` while in STOPPED state and not re-run handlers', async done => {
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
    expect(app.state).toBe(STARTED);

    // Start application
    await app.stop();

    // Check starting state
    expect(app.state).toBe(STOPPED);
    await app.stop();

    // Done
    done();
  });
  it('should not allow `app.stop()` while in STARTING state', async done => {
    expect.assertions(2);
    const app = new Komapi();
    app.state = STARTING;

    // Assert initial state
    expect(app.state).toBe(STARTING);
    await expect(app.stop()).rejects.toThrow('Cannot stop application while in `STARTING` state');

    // Done
    done();
  });
});
