// Imports
import Koa from 'koa';
import Komapi from '../../../src/lib/Komapi';
import Service from '../../../src/lib/Service';
import request from 'supertest';

// Test Setup
afterEach(() => {
  [
    'warning',
    'SIGTERM',
    'SIGINT',
    'SIGHUP',
    'uncaughtException',
    'unhandledRejection',
    'multipleResolves',
    'beforeExit',
  ].forEach(event => process.removeAllListeners(event));
});

// Tests
describe('instantiation', () => {
  it('should use sane defaults', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    const app = new Komapi();

    // Assertions
    expect(app.env).toBe('development');
    expect(app.proxy).toBe(false);
    expect(app.subdomainOffset).toBe(2);
    expect(app.silent).toBe(undefined);
    expect(app.keys).toBe(undefined);
    expect(app.log.level).toBe('info');

    // Cleanup
    process.env.LOG_LEVEL = originalLogLevel;
    process.env.NODE_ENV = originalEnv;
  });
  it('should integrate with koa', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const app = new Komapi();

    // Assertions
    expect(app.env).toBe('development');
    expect(app.proxy).toBe(false);
    expect(app.subdomainOffset).toBe(2);
    expect(app.silent).toBe(undefined);
    expect(app.keys).toBe(undefined);
    expect(app.env).toBe(app.config.env);
    expect(app.proxy).toBe(app.config.proxy);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.silent).toBe(app.config.silent);
    expect(app.keys).toBe(app.config.keys);

    app.env = 'production';
    app.proxy = true;
    app.subdomainOffset = 3;
    app.silent = false;
    app.keys = ['my-key'];

    expect(app.config.env).toBe('production');
    expect(app.config.proxy).toBe(true);
    expect(app.subdomainOffset).toBe(3);
    expect(app.silent).toBe(false);
    expect(app.keys).toEqual(['my-key']);
    expect(app.env).toBe(app.config.env);
    expect(app.proxy).toBe(app.config.proxy);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.silent).toBe(app.config.silent);
    expect(app.keys).toBe(app.config.keys);

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
  it('should augment koa base request, response and context types', () => {
    const app = new Komapi();

    // Assertions
    expect(app.request).toHaveProperty('auth');
    expect(app.request).toHaveProperty('log');
    expect(app.request).toHaveProperty('requestId');
    expect(app.response).toHaveProperty('send');
    expect(app.response).toHaveProperty('sendAPI');
    expect(app.context).toHaveProperty('services');
    expect(app.context.services).toBe(app.services);
  });
  it('should add default middlewares', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware.length).toBe(3);
    expect(app.middleware[0].name).toBe('errorHandlerMiddleware');
    expect(app.middleware[1].name).toBe('setTransactionContextMiddleware');
    expect(app.middleware[2].name).toBe('ensureReadyMiddleware');
  });
  it('should add service lifecycle hooks automatically', async done => {
    expect.assertions(8);
    const initSpy = jest.fn();
    const closeSpy = jest.fn();
    class TestService extends Service {
      public init = initSpy;
      public close = closeSpy;
    }
    const app = new Komapi({
      services: {
        Test: TestService,
      },
    }) as Komapi & {
      initHandlers: Komapi.LifecycleHandler;
      closeHandlers: Komapi.LifecycleHandler;
    };

    // Assertions
    expect(app.initHandlers.length).toBe(1);
    expect(app.closeHandlers.length).toBe(1);
    expect(initSpy).not.toHaveBeenCalled();

    await app.init();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(app);
    expect(closeSpy).not.toHaveBeenCalled();

    await app.close();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(app);

    // Done
    done();
  });
  it('should add node event handlers', async done => {
    expect.assertions(10);
    const originalOn = process.on;
    const originalOnce = process.once;
    const onSpy = jest.fn();
    const onceSpy = jest.fn();

    global.process.on = onSpy as any;
    global.process.once = onceSpy as any;

    const app = new Komapi();

    // Assertions
    expect(onSpy).toHaveBeenCalledTimes(1);
    expect(onSpy).toHaveBeenNthCalledWith(1, 'warning', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledTimes(7);
    expect(onceSpy).toHaveBeenNthCalledWith(1, 'SIGTERM', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(2, 'SIGINT', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(3, 'SIGHUP', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(4, 'uncaughtException', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(5, 'unhandledRejection', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(6, 'multipleResolves', expect.any(Function));
    expect(onceSpy).toHaveBeenNthCalledWith(7, 'beforeExit', expect.any(Function));

    // Cleanup
    global.process.on = originalOn;
    global.process.once = originalOnce;

    // Done
    done();
  });
});
describe('setup', () => {
  describe('app.use', () => {
    it('should log usage', () => {
      expect.assertions(6);
      const app = new Komapi();
      const namedFunction = async () => {};

      // Mock
      const logSpy = jest.fn();
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'debug' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Prepare
      app.use(namedFunction);
      app.use(async () => {});
      app.use(async () => {}, async () => {});
      app.use('/path', async () => {});
      app.use('/path', async () => {}, async () => {});

      // Assertions
      expect(logSpy).toHaveBeenCalledTimes(5);
      expect(logSpy).toHaveBeenNthCalledWith(1, { metadata: { middlewares: ['namedFunction'] } }, 'Added middlewares');
      expect(logSpy).toHaveBeenNthCalledWith(2, { metadata: { middlewares: ['UNKNOWN'] } }, 'Added middlewares');
      expect(logSpy).toHaveBeenNthCalledWith(
        3,
        { metadata: { middlewares: ['UNKNOWN', 'UNKNOWN'] } },
        'Added middlewares',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        4,
        { metadata: { middlewares: ['UNKNOWN'], path: '/path' } },
        'Added middlewares',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        5,
        { metadata: { middlewares: ['UNKNOWN', 'UNKNOWN'], path: '/path' } },
        'Added middlewares',
      );
    });
    it('should throw if no middlewares were provided', () => {
      expect.assertions(2);
      const app = new Komapi();

      // Assertions
      expect(() => app.use()).toThrow('No middlewares provided to `app.use()`');
      expect(() => app.use('/path')).toThrow('No middlewares provided to `app.use()`');
    });
  });
});
describe('life cycle', () => {
  it('should accept init handlers in onInit and onBeforeInit', () => {
    expect.assertions(4);
    const app = new Komapi();

    const handler1 = async () => {};
    const handler2 = async () => {};
    const handler3 = async () => {};

    // Assertions
    expect((app as any).initHandlers.length).toBe(0);

    // Add handlers
    app.onInit(handler3);
    app.onBeforeInit(handler2);
    app.onInit(handler1);

    // Assertions
    expect((app as any).initHandlers[0]).toBe(handler2);
    expect((app as any).initHandlers[1]).toBe(handler3);
    expect((app as any).initHandlers[2]).toBe(handler1);
  });
  it('should not accept init handlers in onInit and onBeforeInit if app is not in `SETUP` state', () => {
    expect.assertions(10);
    const app = new Komapi();

    // Assertions
    app.state = Komapi.Lifecycle.SETUP;
    expect(() => app.onInit(async () => {})).not.toThrow();
    expect(() => app.onBeforeInit(async () => {})).not.toThrow();

    app.state = Komapi.Lifecycle.READYING;
    expect(() => app.onInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `READYING` state',
    );
    expect(() => app.onBeforeInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `READYING` state',
    );

    app.state = Komapi.Lifecycle.READY;
    expect(() => app.onInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `READY` state',
    );
    expect(() => app.onBeforeInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `READY` state',
    );

    app.state = Komapi.Lifecycle.CLOSING;
    expect(() => app.onInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `CLOSING` state',
    );
    expect(() => app.onBeforeInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `CLOSING` state',
    );

    app.state = Komapi.Lifecycle.CLOSED;
    expect(() => app.onInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `CLOSED` state',
    );
    expect(() => app.onBeforeInit(async () => {})).toThrow(
      'Cannot add init lifecycle handlers when application is in `CLOSED` state',
    );
  });
  it('should accept close handlers in onClose and onBeforeClose', () => {
    expect.assertions(4);
    const app = new Komapi();

    const handler1 = async () => {};
    const handler2 = async () => {};
    const handler3 = async () => {};

    // Assertions
    expect((app as any).closeHandlers.length).toBe(0);

    // Add handlers
    app.onClose(handler3);
    app.onBeforeClose(handler2);
    app.onClose(handler1);

    // Assertions
    expect((app as any).closeHandlers[0]).toBe(handler2);
    expect((app as any).closeHandlers[1]).toBe(handler3);
    expect((app as any).closeHandlers[2]).toBe(handler1);
  });
  it('should not accept close handlers in onClose and onBeforeClose if app is in `CLOSING` or `CLOSED` state', () => {
    expect.assertions(10);
    const app = new Komapi();

    // Assertions
    app.state = Komapi.Lifecycle.SETUP;
    expect(() => app.onClose(async () => {})).not.toThrow();
    expect(() => app.onBeforeClose(async () => {})).not.toThrow();

    app.state = Komapi.Lifecycle.READYING;
    expect(() => app.onClose(async () => {})).not.toThrow();
    expect(() => app.onBeforeClose(async () => {})).not.toThrow();

    app.state = Komapi.Lifecycle.READY;
    expect(() => app.onClose(async () => {})).not.toThrow();
    expect(() => app.onBeforeClose(async () => {})).not.toThrow();

    app.state = Komapi.Lifecycle.CLOSING;
    expect(() => app.onClose(async () => {})).toThrow(
      'Cannot add close lifecycle handlers when application is in `CLOSING` state',
    );
    expect(() => app.onBeforeClose(async () => {})).toThrow(
      'Cannot add close lifecycle handlers when application is in `CLOSING` state',
    );

    app.state = Komapi.Lifecycle.CLOSED;
    expect(() => app.onClose(async () => {})).toThrow(
      'Cannot add close lifecycle handlers when application is in `CLOSED` state',
    );
    expect(() => app.onBeforeClose(async () => {})).toThrow(
      'Cannot add close lifecycle handlers when application is in `CLOSED` state',
    );
  });
  it('should accept valid state changes', () => {
    expect.assertions(10);
    const app = new Komapi();

    // Assertions
    app.state = Komapi.Lifecycle.SETUP;
    expect(() => app.setState(Komapi.Lifecycle.READYING)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.READY)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).not.toThrow();

    app.state = Komapi.Lifecycle.SETUP;
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).not.toThrow();

    app.state = Komapi.Lifecycle.READYING;
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).not.toThrow();

    app.state = Komapi.Lifecycle.READY;
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).not.toThrow();
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).not.toThrow();
  });
  it('should not accept invalid state changes', () => {
    expect.assertions(13);
    const app = new Komapi();

    // Assertions
    app.state = Komapi.Lifecycle.SETUP;
    expect(() => app.setState(Komapi.Lifecycle.READY)).toThrow('Cannot change state from `SETUP` => `READY`');

    app.state = Komapi.Lifecycle.READYING;
    expect(() => app.setState(Komapi.Lifecycle.READYING)).toThrow('Cannot change state from `READYING` => `READYING`');
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).toThrow('Cannot change state from `READYING` => `CLOSED`');

    app.state = Komapi.Lifecycle.READY;
    expect(() => app.setState(Komapi.Lifecycle.READYING)).toThrow('Cannot change state from `READY` => `READYING`');
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).toThrow('Cannot change state from `READY` => `CLOSED`');

    app.state = Komapi.Lifecycle.CLOSING;
    expect(() => app.setState(Komapi.Lifecycle.READYING)).toThrow('Cannot change state from `CLOSING` => `READYING`');
    expect(() => app.setState(Komapi.Lifecycle.READY)).toThrow('Cannot change state from `CLOSING` => `READY`');
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).toThrow('Cannot change state from `CLOSING` => `CLOSING`');

    app.state = Komapi.Lifecycle.CLOSED;
    expect(() => app.setState(Komapi.Lifecycle.READYING)).toThrow('Cannot change state from `CLOSED` => `READYING`');
    expect(() => app.setState(Komapi.Lifecycle.READY)).toThrow('Cannot change state from `CLOSED` => `READY`');
    expect(() => app.setState(Komapi.Lifecycle.CLOSING)).toThrow('Cannot change state from `CLOSED` => `CLOSING`');
    expect(() => app.setState(Komapi.Lifecycle.CLOSED)).toThrow('Cannot change state from `CLOSED` => `CLOSED`');

    expect(() => app.setState('UNKNOWN' as any)).toThrow('Cannot set state to unknown state `UNKNOWN`');
  });
  it('should log init lifecycle', async done => {
    expect.assertions(3);
    const app = new Komapi();
    const namedFunction = async () => {};

    // Prepare
    app.onInit(namedFunction);
    app.onInit(async () => {});

    const logSpy = jest.fn();
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'trace' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    await app.init();
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      {
        metadata: {
          name: 'namedFunction',
          duration: expect.any(Number),
        },
      },
      'Init lifecycle handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      {
        metadata: {
          name: 'UNKNOWN',
          duration: expect.any(Number),
        },
      },
      'Init lifecycle handler called',
    );

    // Done
    done();
  });
  it('should log close lifecycle', async done => {
    expect.assertions(3);
    const app = new Komapi();
    const namedFunction = async () => {};

    // Prepare
    app.onClose(namedFunction);
    app.onClose(async () => {});

    const logSpy = jest.fn();
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'trace' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    await app.close();
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      {
        metadata: {
          name: 'namedFunction',
          duration: expect.any(Number),
        },
      },
      'Close lifecycle handler called',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      {
        metadata: {
          name: 'UNKNOWN',
          duration: expect.any(Number),
        },
      },
      'Close lifecycle handler called',
    );

    // Done
    done();
  });
  it('should register `server.close()` lifecycle on `app.listen()` automatically', async done => {
    expect.assertions(5);
    const app = new Komapi();
    let serverCloseListener: Komapi.LifecycleHandler;
    const closeSpy = jest.fn(handler => {
      serverCloseListener = handler;
    });
    app.onClose = closeSpy;

    // Assertions
    const listenServer = app.listen();
    const originalClose = listenServer.close;
    const serverCloseSpy = jest.fn();
    listenServer.close = serverCloseSpy;
    const server = request(listenServer);
    const response = await server.get('/');

    // Assertions
    expect(response.status).toBe(404);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(serverCloseSpy).toHaveBeenCalledTimes(0);

    // Mock closing the server and check that it actually closed
    expect(typeof serverCloseListener!).toBe('function');
    serverCloseListener!(app);
    expect(serverCloseSpy).toHaveBeenCalledTimes(1);
    listenServer.close = originalClose;

    // Done
    done();
  });
  it('should log error events', async done => {
    expect.assertions(5);
    const app = new Komapi();
    const logSpy = jest.fn();
    const contextLogSpy = jest.fn();

    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'error' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Prepare
    const applicationError = new Error('application error');
    const contextError = new Error('context error');
    app.emit('error', applicationError);
    app.use((ctx, next) => {
      ctx.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'error' ? contextLogSpy : Reflect.get(obj, prop);
        },
      });
      return next();
    });
    app.use(ctx => {
      ctx.onerror(contextError);
    });

    // Assertions
    const server = request(app.callback());
    const response = await server.get('/');

    // Assertions
    expect(response.status).toBe(500);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({ app, err: applicationError }, 'Application Error Event');
    expect(contextLogSpy).toHaveBeenCalledTimes(1);
    expect(contextLogSpy).toHaveBeenCalledWith({ app, err: contextError }, 'Application Error Event');

    // Done
    done();
  });
});
describe('request cycle', () => {
  it('should augment koa request, response and context types', async done => {
    expect.assertions(18);
    const app = new Komapi();
    let requestCtx: Koa.Context;

    // Add middlewares
    app.use((ctx, next) => {
      requestCtx = ctx;
      return next();
    });
    app.use(ctx => {
      if (ctx.url === '/sendAPI') ctx.sendAPI({ status: 'success' });
      else ctx.send({ status: 'success' });
    });

    const server = request(app.callback());
    const response = await server.get('/send');
    const responseAPI = await server.get('/sendAPI');

    // Assertions
    expect(requestCtx!.request.auth).toBe(null);
    expect(typeof requestCtx!.request.log).toBe('object');
    expect(typeof requestCtx!.request.requestId).toBe('string');
    expect(typeof requestCtx!.request.startAt).toBe('number');
    expect(typeof requestCtx!.response.send).toBe('function');
    expect(typeof requestCtx!.response.sendAPI).toBe('function');
    expect(requestCtx!.services).toBe(app.services);
    expect(requestCtx!.log).toBe(requestCtx!.request.log);
    expect(requestCtx!.auth).toBe(requestCtx!.request.auth);
    expect(requestCtx!.requestId).toBe(requestCtx!.request.requestId);
    expect(requestCtx!.startAt).toBe(requestCtx!.request.startAt);
    expect(requestCtx!.send).toBe(requestCtx!.response.send);
    expect(requestCtx!.sendAPI).toBe(requestCtx!.response.sendAPI);
    expect(requestCtx!.request.requestId).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success' });
    expect(responseAPI.status).toBe(200);
    expect(responseAPI.body).toEqual({ data: { status: 'success' } });

    // Done
    done();
  });
  it('should generate a unique request id', async done => {
    expect.assertions(5);
    const app = new Komapi();

    // Add middlewares
    app.use(ctx => ctx.send(ctx.request.requestId));

    const server = request(app.callback());
    const responses = await Promise.all([server.get('/'), server.get('/')]);

    // Assertions
    expect(responses[0].status).toBe(200);
    expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    expect(responses[1].status).toBe(200);
    expect(responses[1].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    expect(responses[0].text).not.toEqual(responses[1].text);

    // Done
    done();
  });
  it('should trust the x-request-id header if app.proxy = true', async done => {
    expect.assertions(4);
    const app = new Komapi({ config: { proxy: true } });

    // Add middlewares
    app.use(ctx => ctx.send(ctx.request.requestId));

    const server = request(app.callback());
    const responses = await Promise.all([
      server.get('/').set('x-request-id', 'req1'),
      server.get('/').set('x-request-id', 'req2'),
    ]);

    // Assertions
    expect(responses[0].status).toBe(200);
    expect(responses[0].text).toBe('req1');
    expect(responses[1].status).toBe(200);
    expect(responses[1].text).toBe('req2');

    // Done
    done();
  });
});
describe('node event handlers', () => {
  it('should try to gracefully shut down node on `SIGINT` `SIGTERM` and `SIGHUP`', async done => {
    expect.assertions(36);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    // Try all signals
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
      let listener;
      const closeSpy = jest.fn();
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
      app.close = closeSpy;
      app.log = new Proxy(app.log, {
        get(obj, prop) {
          return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
        },
      });

      // Global assertions
      expect(listener).not.toBe(undefined);

      // Assertions - all successful
      await (listener as any)(signal);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledWith();
      expect(logSpy).toHaveBeenCalledTimes(0);
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);

      // Setup for fail scenario
      const err = new Error('mock fail to close');
      closeSpy.mockClear();
      logSpy.mockClear();
      exitSpy.mockClear();
      closeSpy.mockImplementation(() => {
        throw err;
      });

      // Assertions - failed to close
      await (listener as any)(signal);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledWith();
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
  it('should forcefully shut down node on uncaught exception', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const closeSpy = jest.fn();
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
    app.close = closeSpy;
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'fatal' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    expect(listener).not.toBe(undefined);
    const uncaughtException = new Error('my uncaught exception');
    await (listener as any)(uncaughtException);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith();
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
  it('should forcefully shut down node on unhandled rejection', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const closeSpy = jest.fn();
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
    app.close = closeSpy;
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
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith();
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
  it('should forcefully shut down node on multiple resolves on a single promise', async done => {
    expect.assertions(7);
    const originalOn = process.on;
    const originalOnce = process.once;
    const originalExit = process.exit;

    let listener;
    const closeSpy = jest.fn();
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
    app.close = closeSpy;
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
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith();
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
  it('should try to clean up on beforeExit', async done => {
    expect.assertions(4);
    const originalOn = process.on;
    const originalOnce = process.once;

    let listener;
    const closeSpy = jest.fn();
    const logSpy = jest.fn();
    const onSpy = jest.fn();
    const onceSpy = jest.fn((event, handler) => {
      if (event === 'beforeExit') listener = handler;
    });

    global.process.on = onSpy as any;
    global.process.once = onceSpy as any;

    const app = new Komapi();
    app.close = closeSpy;
    app.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'debug' ? logSpy : Reflect.get(obj, prop);
      },
    });

    // Assertions
    expect(listener).not.toBe(undefined);
    await (listener as any)();
    expect(closeSpy).toHaveBeenCalledTimes(1);
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
