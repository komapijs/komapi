// Imports
import Komapi from '../../../fixtures/Komapi';
import { MultiError } from 'verror';

// State values
const STARTED = 'STARTED' as Komapi.LifecycleState.STARTED;
const STARTING = 'STARTING' as Komapi.LifecycleState.STARTING;
const STOPPED = 'STOPPED' as Komapi.LifecycleState.STOPPED;
const STOPPING = 'STOPPING' as Komapi.LifecycleState.STOPPING;

// Tests
describe('state', () => {
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
  it('should stop if any start handler encounters an error and call `app.stop()`', async done => {
    expect.assertions(6);
    const app = new Komapi();
    let counter = 0;

    // Add handlers
    app.onStart(() => {
      expect(counter).toBe(0);
      counter += 1;
    });
    app.onStart(() => {
      expect(counter).toBe(1);
      counter += 1;
      throw new Error('Should stop start');
    });
    app.onStart(() => {
      fail('should not be called');
      counter += 1;
    });

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    const p = app.start();

    // Check starting state
    expect(app.state).toBe(STARTING);

    // Let application start
    await expect(p).rejects.toThrow('Should stop start');

    // Assert ending state
    expect(app.state).toBe(STOPPED);

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
  it('should continue with all stop handlers even if any stop handler encounters an error', async done => {
    expect.assertions(12);
    const app = new Komapi();
    let counter = 0;

    // Add handlers
    app.onStop(() => {
      expect(counter).toBe(3);
      counter += 1;
    });
    app.onStop(() => {
      expect(counter).toBe(2);
      counter += 1;
      throw new Error('Should stop 2');
    });
    app.onStop(() => {
      expect(counter).toBe(1);
      counter += 1;
      throw new Error('Should stop 1');
    });
    app.onStop(() => {
      expect(counter).toBe(0);
      counter += 1;
    });

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start();
    expect(app.state).toBe(STARTED);
    const p = app.stop();

    // Check starting state
    expect(app.state).toBe(STOPPING);

    // Let application stop
    try {
      await p;
    } catch (err) {
      expect(err instanceof MultiError).toBe(true);
      expect(err.message).toBe('first of 2 errors: Should stop 1');
      expect(err.errors().some((e: Error) => !(e instanceof Error))).toBe(false);
      expect(err.errors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Should stop 1',
          }),
          expect.objectContaining({
            message: 'Should stop 2',
          }),
        ]),
      );
    }

    // Assert ending state
    expect(app.state).toBe(STOPPED);

    // Done
    done();
  });
});
describe('node events', () => {
  describe('beforeExit', () => {
    it('should invoke `app.stop()`', async done => {
      expect.assertions(4);
      const originalOn = process.on;
      const originalOnce = process.once;

      let listener;
      const stopSpy = jest.fn();
      const logSpy = jest.fn();
      const onSpy = jest.fn();
      const onceSpy = jest.fn((event, handler) => {
        if (event === 'beforeExit') listener = handler;
      });

      global.process.on = onSpy as any;
      global.process.once = onceSpy as any;

      const app = new Komapi();
      app.state = STARTED;
      app.stop = stopSpy;
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'debug' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Assertions
      expect(listener).not.toBe(undefined);
      await (listener as any)();
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        {
          app,
        },
        'Before exit event triggered - ensuring graceful shutdown',
      );

      // Cleanup
      global.process.on = originalOn;
      global.process.once = originalOnce;

      // Done
      done();
    });
  });
  describe('warning', () => {
    it('should log any node warnings', async done => {
      expect.assertions(3);
      const originalOn = process.on;
      const originalOnce = process.once;

      let listener;
      const logSpy = jest.fn();
      const onSpy = jest.fn((event, handler) => {
        if (event === 'warning') listener = handler;
      });
      const onceSpy = jest.fn();

      global.process.on = onSpy as any;
      global.process.once = onceSpy as any;

      const app = new Komapi();
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'warn' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Assertions
      expect(listener).not.toBe(undefined);
      const customWarning = new Error('my custom warning');
      await (listener as any)(customWarning);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        {
          app,
          stack: customWarning.stack,
          metadata: {
            message: 'my custom warning',
          },
        },
        'NodeJS warning detected - see metadata and stack property for more information',
      );

      // Cleanup
      global.process.on = originalOn;
      global.process.once = originalOnce;

      // Done
      done();
    });
  });
});
describe('external signals', () => {
  it('should gracefully shut down on `SIGINT` `SIGTERM` and `SIGHUP` with exit code 0', async done => {
    expect.assertions(18);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    // Try all signals
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
      let listener;
      const stopSpy = jest.fn();
      const logSpy = jest.fn();
      const exitSpy = jest.fn();
      const onSpy = jest.fn();
      const onceSpy = jest.fn((event, handler) => {
        if (event === signal) listener = handler;
      });

      global.process.exit = exitSpy as any;
      global.process.on = onSpy as any;
      global.process.once = onceSpy as any;

      const app = new Komapi();
      app.stop = stopSpy;
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Global assertions
      expect(listener).not.toBe(undefined);

      // Assertions - all successful
      await (listener as any)(signal);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledWith();
      expect(logSpy).toHaveBeenCalledTimes(0);
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);
    }

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
  it('should forcefully shut down node with exit code 1 on errors during graceful shutdown on `SIGINT` `SIGTERM` and `SIGHUP`', async done => {
    expect.assertions(18);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    // Try all signals
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
      let listener;
      const stopSpy = jest.fn();
      const logSpy = jest.fn();
      const exitSpy = jest.fn();
      const onSpy = jest.fn();
      const onceSpy = jest.fn((event, handler) => {
        if (event === signal) listener = handler;
      });

      global.process.exit = exitSpy as any;
      global.process.on = onSpy as any;
      global.process.once = onceSpy as any;

      const app = new Komapi();
      app.stop = stopSpy;
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Setup for fail scenario
      const err = new Error('mock fail to close');
      stopSpy.mockClear();
      logSpy.mockClear();
      exitSpy.mockClear();
      stopSpy.mockImplementation(() => {
        throw err;
      });

      // Assertions - failed to close
      await (listener as any)(signal);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledWith();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        {
          app,
          err,
          metadata: {
            signal,
          },
        },
        `Failed to handle \`${signal}\` gracefully. Exiting with status code 1`,
      );
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    }

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
  it('should forcefully shut down node with exit code 1 on uncaught exception', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const stopSpy = jest.fn();
    const logSpy = jest.fn();
    const exitSpy = jest.fn();
    const onSpy = jest.fn();
    const onceSpy = jest.fn((event, handler) => {
      if (event === 'uncaughtException') listener = handler;
    });

    global.process.exit = exitSpy as any;
    global.process.on = onSpy as any;
    global.process.once = onceSpy as any;

    const app = new Komapi();
    app.stop = stopSpy;
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    expect(listener).not.toBe(undefined);
    const uncaughtException = new Error('my uncaught exception');
    await (listener as any)(uncaughtException);
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      {
        app,
        err: uncaughtException,
      },
      'Uncaught Exception Error - Stopping application to prevent instability',
    );
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
  it('should forcefully shut down node with exit code 1 on unhandled rejection', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const stopSpy = jest.fn();
    const logSpy = jest.fn();
    const exitSpy = jest.fn();
    const onSpy = jest.fn();
    const onceSpy = jest.fn((event, handler) => {
      if (event === 'unhandledRejection') listener = handler;
    });

    global.process.exit = exitSpy as any;
    global.process.on = onSpy as any;
    global.process.once = onceSpy as any;

    const app = new Komapi();
    app.stop = stopSpy;
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    expect(listener).not.toBe(undefined);
    const unhandledRejection = new Promise((resolve, reject) => reject(new Error('my unhandled rejection'))).catch(
      e => e,
    );
    const unhandledRejectionError = new Error('unhandled rejection error');
    await (listener as any)(unhandledRejectionError, unhandledRejection);
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      {
        app,
        err: unhandledRejectionError,
        metadata: {
          promise: unhandledRejection,
        },
      },
      'Unhandled Rejected Promise - Stopping application to prevent instability',
    );
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
  it('should forcefully shut down node with exit code 1 on multiple resolves on a single promise', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const stopSpy = jest.fn();
    const logSpy = jest.fn();
    const exitSpy = jest.fn();
    const onSpy = jest.fn();
    const onceSpy = jest.fn((event, handler) => {
      if (event === 'multipleResolves') listener = handler;
    });

    global.process.exit = exitSpy as any;
    global.process.on = onSpy as any;
    global.process.once = onceSpy as any;

    const app = new Komapi();
    app.stop = stopSpy;
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
      },
    });
    global.process.exit = exitSpy as any;

    // Assertions
    expect(listener).not.toBe(undefined);
    const unhandledRejection = new Promise((resolve, reject) => reject(new Error('my unhandled rejection'))).catch(
      e => e,
    );
    await (listener as any)('resolve', unhandledRejection, 'value something');
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      {
        app,
        metadata: {
          type: 'resolve',
          promise: unhandledRejection,
          value: 'value something',
        },
      },
      'Promise resolved or rejected more than once - Stopping application to prevent instability',
    );
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
});
