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
describe('app.addLifecycleHandler()', () => {
  it('should add lifecycle handlers after existing lifecycle handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { name: 'first', start: () => {}, stop: () => {} };
    const shouldBe2ndHandler = { name: 'second', start: () => {}, stop: () => {} };
    const shouldBe3rdHandler = { name: 'third', start: () => {}, stop: () => {} };
    const shouldBe4thHandler = { name: 'fourth', start: () => {}, stop: () => {} };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandler(shouldBe4thHandler);

    // Assertions
    expect(app.lifecycleHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
  it('should return function to remove handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { name: 'first', start: () => {}, stop: () => {} };
    const shouldBe2ndHandler = { name: 'second', start: () => {}, stop: () => {} };
    const shouldBe3rdHandler = { name: 'third', start: () => {}, stop: () => {} };
    const shouldBe4thHandler = { name: 'fourth', start: () => {}, stop: () => {} };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    const removeHandlers = app.addLifecycleHandler(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandler(shouldBe4thHandler);

    // Assertions
    expect(app.lifecycleHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
    expect(typeof removeHandlers).toBe('function');

    // Remove handlers
    removeHandlers();

    // Assertions
    expect(app.lifecycleHandlers).toEqual([shouldBe1stHandler, shouldBe4thHandler]);
  });
});
describe('app.addLifecycleHandlerBefore()', () => {
  it('should add lifecycle handlers before existing lifecycle handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { name: 'first', start: () => {}, stop: () => {} };
    const shouldBe2ndHandler = { name: 'second', start: () => {}, stop: () => {} };
    const shouldBe3rdHandler = { name: 'third', start: () => {}, stop: () => {} };
    const shouldBe4thHandler = { name: 'fourth', start: () => {}, stop: () => {} };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

    // Assertions
    expect(app.lifecycleHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
  });
  it('should return function to remove handlers', () => {
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { name: 'first', start: () => {}, stop: () => {} };
    const shouldBe2ndHandler = { name: 'second', start: () => {}, stop: () => {} };
    const shouldBe3rdHandler = { name: 'third', start: () => {}, stop: () => {} };
    const shouldBe4thHandler = { name: 'fourth', start: () => {}, stop: () => {} };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    const removeHandlers = app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

    // Assertions
    expect(app.lifecycleHandlers).toEqual([
      shouldBe1stHandler,
      shouldBe2ndHandler,
      shouldBe3rdHandler,
      shouldBe4thHandler,
    ]);
    expect(typeof removeHandlers).toBe('function');

    // Remove handlers
    removeHandlers();

    // Assertions
    expect(app.lifecycleHandlers).toEqual([shouldBe1stHandler, shouldBe4thHandler]);
  });
});
describe('app.start()', () => {
  it('should transition from STOPPED to STARTING => STARTED state and run handlers', async done => {
    expect.assertions(11);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      start: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      start: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      start: jest.fn(() => {
        expect(counter).toBe(2);
        counter += 1;
      }),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      start: jest.fn(() => {
        expect(counter).toBe(3);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

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
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe3rdHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe4thHandler.start).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should transition from STOPPED to STARTING => STARTED state and run the provided handlers', async done => {
    expect.assertions(4);
    const app = new Komapi();

    // Create handlers
    const shouldNotBeCalledHandler = {
      name: 'first',
      start: jest.fn(),
    };
    const shouldBeCalledHandler = {
      name: 'second',
      start: jest.fn(),
    };

    // Add handlers
    app.addLifecycleHandler(shouldNotBeCalledHandler);

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start({ handlers: [shouldBeCalledHandler] });

    // Assert ending state
    expect(app.state).toBe(STARTED);
    expect(shouldNotBeCalledHandler.start).not.toHaveBeenCalled();
    expect(shouldBeCalledHandler.start).toHaveBeenCalled();

    // Done
    done();
  });
  it('should log useful information', async done => {
    expect.assertions(6);
    const app = new Komapi();
    const logSpy = jest.fn();
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'trace' ? logSpy : Reflect.get(obj, prop);
      },
    });
    const MyConstHandler = () => {};

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      start: () => {},
    };
    const shouldBe2ndHandler = {
      start: function MyHandler() {
        return 'myoutput';
      },
      stop: () => {},
    };
    const shouldBe3rdHandler = {
      start: MyConstHandler,
    };
    const shouldBe4thHandler = {
      start: () => {},
    };
    const shouldBe5thHandler = {
      start() {},
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);
    app.addLifecycleHandler(shouldBe3rdHandler);
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandler(shouldBe5thHandler);

    // Start
    await app.start();

    // Assert ending state
    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ metadata: { duration: expect.any(Number), hasRollbackHandler: false, name: 'first' } }),
      'Lifecycle start handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        metadata: { duration: expect.any(Number), output: 'myoutput', hasRollbackHandler: true, name: 'MyHandler' },
      }),
      'Lifecycle start handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        metadata: { duration: expect.any(Number), hasRollbackHandler: false, name: 'MyConstHandler' },
      }),
      'Lifecycle start handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ metadata: { duration: expect.any(Number), hasRollbackHandler: false, name: 'start' } }),
      'Lifecycle start handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ metadata: { duration: expect.any(Number), hasRollbackHandler: false, name: 'start' } }),
      'Lifecycle start handler called',
    );

    // Done
    done();
  });
  it('should allow `app.start()` while in STARTING state and not re-run handlers', async done => {
    expect.assertions(12);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      start: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      start: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      start: jest.fn(() => {
        expect(counter).toBe(2);
        counter += 1;
      }),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      start: jest.fn(() => {
        expect(counter).toBe(3);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

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
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe3rdHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe4thHandler.start).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should allow `app.start()` while in STARTED state and not re-run handlers', async done => {
    expect.assertions(11);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      start: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      start: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      start: jest.fn(() => {
        expect(counter).toBe(2);
        counter += 1;
      }),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      start: jest.fn(() => {
        expect(counter).toBe(3);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start();

    // Check starting state
    expect(app.state).toBe(STARTED);
    await app.start();
    expect(app.state).toBe(STARTED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe3rdHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe4thHandler.start).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should allow `app.start()` while in STARTED state and re-run handlers if `options.force = true`', async done => {
    expect.assertions(7);
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      start: jest.fn(),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      start: jest.fn(),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      start: jest.fn(),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      start: jest.fn(),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start();

    // Check starting state
    expect(app.state).toBe(STARTED);
    await app.start({ force: true });
    expect(app.state).toBe(STARTED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(2);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(2);
    expect(shouldBe3rdHandler.start).toHaveBeenCalledTimes(2);
    expect(shouldBe4thHandler.start).toHaveBeenCalledTimes(2);

    // Done
    done();
  });
  it('should allow `app.start()` while in STOPPING state and await for STOPPED state before starting', async done => {
    expect.assertions(21);
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { start: jest.fn(), stop: jest.fn() };
    const shouldBe2ndHandler = { start: jest.fn(), stop: jest.fn() };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    await app.start();

    // Check starting state
    expect(app.state).toBe(STARTED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(0);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(0);

    // Stop application in the background
    const stopPromise = app.stop();
    expect(app.state).toBe(STOPPING);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(0);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Start application and wait for stop
    const startPromise = app.start();
    await stopPromise;
    expect(app.state).toBe(STOPPED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Await for application start
    await startPromise;
    expect(app.state).toBe(STARTED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(2);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(2);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should stop if any start handler encounters an error and call `app.stop()` with only the stop handlers before the failed start handler', async done => {
    expect.assertions(14);
    const app = new Komapi();
    let startCounter = 0;
    let stopCounter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: jest.fn(() => {
        expect(stopCounter).toBe(1);
        stopCounter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      start: jest.fn(async () => {
        expect(startCounter).toBe(0);
        startCounter += 1;
      }),
      stop: jest.fn(() => {
        expect(stopCounter).toBe(0);
        stopCounter += 1;
      }),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      start: jest.fn(() => {
        expect(startCounter).toBe(1);
        startCounter += 1;
        throw new Error('Should stop start');
      }),
      stop: jest.fn(() => {
        fail('should not be called');
        stopCounter += 1;
      }),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      start: jest.fn(() => {
        fail('should not be called');
        startCounter += 1;
      }),
      stop: jest.fn(() => {
        fail('should not be called');
        stopCounter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);
    app.addLifecycleHandler(shouldBe3rdHandler);
    app.addLifecycleHandler(shouldBe4thHandler);

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
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe3rdHandler.stop).not.toHaveBeenCalled();
    expect(shouldBe4thHandler.start).not.toHaveBeenCalled();
    expect(shouldBe4thHandler.stop).not.toHaveBeenCalled();

    // Done
    done();
  });
});
describe('app.stop()', () => {
  it('should transition from STARTED to STOPPING => STOPPED state and run handlers', async done => {
    expect.assertions(11);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: jest.fn(() => {
        expect(counter).toBe(3);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      stop: jest.fn(() => {
        expect(counter).toBe(2);
        counter += 1;
      }),
    };
    const shouldBe3rdHandler = {
      name: 'third',
      stop: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      stop: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

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
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe3rdHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe4thHandler.stop).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should transition from STARTED to STOPPING => STOPPED state and run the provided handlers', async done => {
    expect.assertions(4);
    const app = new Komapi();

    // Create handlers
    const shouldNotBeCalledHandler = {
      name: 'first',
      stop: jest.fn(),
    };
    const shouldBeCalledHandler = {
      name: 'second',
      stop: jest.fn(),
    };

    // Add handlers
    app.addLifecycleHandler(shouldNotBeCalledHandler);

    // Assert initial state
    await app.start();
    expect(app.state).toBe(STARTED);

    // Start application
    await app.stop({ handlers: [shouldBeCalledHandler] });

    // Assert ending state
    expect(app.state).toBe(STOPPED);
    expect(shouldNotBeCalledHandler.stop).not.toHaveBeenCalled();
    expect(shouldBeCalledHandler.stop).toHaveBeenCalled();

    // Done
    done();
  });
  it('should log useful information', async done => {
    expect.assertions(6);
    const app = new Komapi();
    const logSpy = jest.fn();
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'trace' ? logSpy : Reflect.get(obj, prop);
      },
    });
    const MyConstHandler = () => {};

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: () => {},
    };
    const shouldBe2ndHandler = {
      stop: function MyHandler() {
        return 'myoutput';
      },
    };
    const shouldBe3rdHandler = {
      stop: MyConstHandler,
    };
    const shouldBe4thHandler = {
      stop: () => {},
    };
    const shouldBe5thHandler = {
      stop() {},
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe5thHandler);
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandler(shouldBe3rdHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);
    app.addLifecycleHandler(shouldBe1stHandler);

    // Start
    await app.start();
    await app.stop();

    // Assert ending state
    expect(logSpy).toHaveBeenCalledTimes(5);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ metadata: { duration: expect.any(Number), name: 'first' } }),
      'Lifecycle stop handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ metadata: { duration: expect.any(Number), output: 'myoutput', name: 'MyHandler' } }),
      'Lifecycle stop handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ metadata: { duration: expect.any(Number), name: 'MyConstHandler' } }),
      'Lifecycle stop handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ metadata: { duration: expect.any(Number), name: 'stop' } }),
      'Lifecycle stop handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ metadata: { duration: expect.any(Number), name: 'stop' } }),
      'Lifecycle stop handler called',
    );

    // Done
    done();
  });
  it('should allow `app.stop()` while in STOPPING state and not re-run handlers', async done => {
    expect.assertions(8);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      stop: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);

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
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should allow `app.stop()` while in STOPPED state and not re-run handlers', async done => {
    expect.assertions(8);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: jest.fn(() => {
        expect(counter).toBe(1);
        counter += 1;
      }),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      stop: jest.fn(() => {
        expect(counter).toBe(0);
        counter += 1;
      }),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);

    // Prepare
    await app.start();

    // Assert initial state
    expect(app.state).toBe(STARTED);

    // Start application
    await app.stop();
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Check starting state
    expect(app.state).toBe(STOPPED);
    await app.stop();
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should allow `app.stop()` while in STOPPED state and re-run handlers if `options.force = true`', async done => {
    expect.assertions(6);
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: jest.fn(),
    };
    const shouldBe2ndHandler = {
      name: 'second',
      stop: jest.fn(),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);

    // Prepare
    await app.start();

    // Assert initial state
    expect(app.state).toBe(STARTED);

    // Start application
    await app.stop();
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Check starting state
    expect(app.state).toBe(STOPPED);
    await app.stop({ force: true });
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(2);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(2);

    // Done
    done();
  });
  it('should allow `app.stop()` while in STARTING state and wait STARTED state before stopping', async done => {
    expect.assertions(16);
    const app = new Komapi();

    // Create handlers
    const shouldBe1stHandler = { start: jest.fn(), stop: jest.fn() };
    const shouldBe2ndHandler = {
      start: jest.fn(),
      stop: jest.fn(async () => new Promise(resolve => process.nextTick(resolve))),
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe1stHandler);
    app.addLifecycleHandler(shouldBe2ndHandler);

    // Assert initial state
    expect(app.state).toBe(STOPPED);

    // Start application
    const startPromise = app.start();

    // Check starting state
    expect(app.state).toBe(STARTING);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(0);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(0);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(0);

    // Stop application in the background
    const stopPromise = app.stop();
    await startPromise;
    await new Promise(resolve => process.nextTick(resolve));
    expect(app.state).toBe(STOPPING);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(0);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Start application and wait for stop
    await stopPromise;
    expect(app.state).toBe(STOPPED);
    expect(shouldBe1stHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe1stHandler.stop).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.start).toHaveBeenCalledTimes(1);
    expect(shouldBe2ndHandler.stop).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should continue with all stop handlers even if any stop handler encounters an error', async done => {
    expect.assertions(12);
    const app = new Komapi();
    let counter = 0;

    // Create handlers
    const shouldBe1stHandler = {
      name: 'first',
      stop: () => {
        expect(counter).toBe(3);
        counter += 1;
      },
    };
    const shouldBe2ndHandler = {
      name: 'second',
      stop: () => {
        expect(counter).toBe(2);
        counter += 1;
        throw new Error('Should stop 2');
      },
    };
    const shouldBe3rdHandler = {
      name: 'third',
      stop: () => {
        expect(counter).toBe(1);
        counter += 1;
        throw new Error('Should stop 1');
      },
    };
    const shouldBe4thHandler = {
      name: 'fourth',
      stop: () => {
        expect(counter).toBe(0);
        counter += 1;
      },
    };

    // Add handlers
    app.addLifecycleHandler(shouldBe4thHandler);
    app.addLifecycleHandlerBefore(shouldBe2ndHandler, shouldBe3rdHandler);
    app.addLifecycleHandlerBefore(shouldBe1stHandler);

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
  it('should gracefully shut down on `SIGINT`, `SIGTERM`, `SIGHUP` and `SIGBREAK` with the appropriate exit code', async done => {
    expect.assertions(24);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    // Try all signals
    for (const exitSignal of [
      { signal: 'SIGTERM', code: 143 },
      { signal: 'SIGINT', code: 130 },
      { signal: 'SIGHUP', code: 129 },
      { signal: 'SIGBREAK', code: 149 },
    ]) {
      let listener;
      const stopSpy = jest.fn();
      const logSpy = jest.fn();
      const exitSpy = jest.fn();
      const onSpy = jest.fn();
      const onceSpy = jest.fn((event, handler) => {
        if (event === exitSignal.signal) listener = handler;
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
      await (listener as any)(exitSignal.signal);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledWith();
      expect(logSpy).toHaveBeenCalledTimes(0);
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(exitSignal.code);
    }

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
  it('should gracefully shut down on `shutdown` message with exit code 0', async done => {
    expect.assertions(6);
    const originalOn = process.on;
    const originalExit = process.exit;

    // Listen for shutdown message
    let listener;
    const stopSpy = jest.fn();
    const logSpy = jest.fn();
    const exitSpy = jest.fn();
    const onSpy = jest.fn((event, handler) => {
      if (event === 'message') listener = handler;
    });

    global.process.exit = exitSpy as any;
    global.process.on = onSpy as any;

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
    await (listener as any)('shutdown');
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledTimes(0);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;

    // Done
    done();
  });
  it('should forcefully shut down node with exit code 1 on errors during graceful shutdown on `SIGINT`, `SIGTERM`, `SIGHUP` and `SIGBREAK`', async done => {
    expect.assertions(24);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    // Try all signals
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGBREAK']) {
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
  it('should forcefully shut down node with exit code 1 on errors during graceful shutdown on `shutdown` message', async done => {
    expect.assertions(6);
    const originalOn = process.on;
    const originalExit = process.exit;

    let listener;
    const stopSpy = jest.fn();
    const logSpy = jest.fn();
    const exitSpy = jest.fn();
    const onSpy = jest.fn((event, handler) => {
      if (event === 'message') listener = handler;
    });

    global.process.exit = exitSpy as any;
    global.process.on = onSpy as any;

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
    await (listener as any)('shutdown');
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      {
        app,
        err,
        metadata: {
          msg: 'shutdown',
        },
      },
      `Failed to handle message \`shutdown\` gracefully. Exiting with status code 1`,
    );
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Cleanup
    global.process.exit = originalExit;
    global.process.on = originalOn;

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
