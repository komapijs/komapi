// Dependencies
import Stream from 'stream';
import request from 'supertest';
import Application from '../../../src';

// Init
const testEnv = process.env.NODE_ENV;
const defaultApplicationConfig = {
  name: 'Komapi application',
  env: testEnv,
  proxy: false,
  subdomainOffset: 2,
  logOptions: expect.objectContaining({
    level: 'info',
  }),
  logStream: process.stdout,
};

// Tests
describe('initialization', () => {
  it('should have sane defaults', () => {
    const app = new Application();

    // Assertions
    expect(app.config).toEqual(expect.objectContaining(defaultApplicationConfig));
    expect(app.state).toEqual(
      expect.objectContaining({
        cache: false,
        locals: {},
        secrets: {},
      }),
    );
  });
  it('should support partial application config', () => {
    const app = new Application({
      name: 'My Custom Application',
      subdomainOffset: 8,
    });

    // Assertions
    expect(app.config).toEqual(
      expect.objectContaining({
        name: 'My Custom Application',
        env: testEnv,
        proxy: false,
        subdomainOffset: 8,
        logOptions: expect.objectContaining({
          level: 'info',
        }),
      }),
    );
  });
  it('should accept user config and secrets for access inn app.state', () => {
    const app = new Application(undefined, { my: 'UserConfig', 2: false }, { secret: 'SECRET' });

    // Assertions
    expect(app.config).toEqual(expect.objectContaining(defaultApplicationConfig));
    expect(app.state).toEqual({
      cache: false,
      locals: { my: 'UserConfig', 2: false },
      secrets: { secret: 'SECRET' },
    });
  });
  it('should generate warnings on environment mismatch', () => {
    const mockStream = new Stream.Writable();
    const mockFn = jest.fn();
    mockStream.write = mockFn;
    const defaultEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const app = new Application({ logStream: mockStream });
    process.env.NODE_ENV = defaultEnv;

    // Assertions
    expect(app.config.env).toBe('development');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFn.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        context: 'application',
        level: 40,
        time: expect.any(Number),
        msg:
          "NODE_ENV environment mismatch. Your application has been started with '{ env: 'development' }' while 'process.env.NODE_ENV = undefined'. It is recommended to start your application with '{ env: process.env.NODE_ENV }' and set the correct environment using the NODE_ENV environment variable.",
        pid: expect.any(Number),
        hostname: expect.stringMatching(/.+/),
        name: defaultApplicationConfig.name,
        instanceId: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
        env: 'development',
      }),
    );
    expect(JSON.parse(mockFn.mock.calls[0][0])).not.toHaveProperty('NODE_ENV');

    // Cleanup
    mockFn.mockClear();
  });
  it('should enable caching in production', () => {
    const app = new Application({ env: 'production', logOptions: { enabled: false } });

    // Assertions
    expect(app.state.cache).toBe(true);
  });
  it('should allow custom state types', () => {
    const customUserConfig: { my: string; 2: boolean; test?: boolean } = { my: 'UserConfig', 2: false };
    const customSecrets: { secret: string; mySecret?: string } = { secret: 'SECRET' };
    const app = new Application({}, customUserConfig, customSecrets);

    // Assertions
    expect(app.config).toEqual(expect.objectContaining(defaultApplicationConfig));
    expect(app.state).toEqual({
      cache: false,
      locals: { my: 'UserConfig', 2: false },
      secrets: { secret: 'SECRET' },
    });
    app.state.locals.test = true;
    app.state.secrets.mySecret = 'newSecret';
    expect(app.state).toEqual({
      cache: false,
      locals: { my: 'UserConfig', 2: false, test: true },
      secrets: { secret: 'SECRET', mySecret: 'newSecret' },
    });
  });
  it('should hide secrets from json output and inspect', () => {
    const app = new Application(undefined, { user: 'config' }, { secret: 'SECRET' });
    const defaultJsonApp = {
      config: {
        name: 'Komapi application',
        env: testEnv,
        instanceId: expect.stringMatching(/.+/),
        proxy: false,
        subdomainOffset: 2,
      },
      state: {
        cache: false,
        locals: { user: 'config' },
        secrets: '****',
      },
    };

    // Assertions
    expect(app.toJSON()).toEqual(defaultJsonApp);
    expect(app.inspect()).toEqual(defaultJsonApp);
  });
  it('should integrate nicely with koa', () => {
    const app = new Application();

    // Assertions
    expect(app.config.name).toBe(defaultApplicationConfig.name);
    expect(app.config.env).toBe(defaultApplicationConfig.env);
    expect(app.config.subdomainOffset).toBe(defaultApplicationConfig.subdomainOffset);
    expect(app.config.proxy).toBe(defaultApplicationConfig.proxy);
    expect((app as any).name).toBe(app.config.name);
    expect(app.env).toBe(app.config.env);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.proxy).toBe(app.config.proxy);

    // Update values
    (app as any).name = 'new name';
    app.env = 'production';
    app.subdomainOffset = defaultApplicationConfig.subdomainOffset + 2;
    app.proxy = !defaultApplicationConfig.proxy;

    // Assertions
    expect(app.config.name).toBe('new name');
    expect(app.config.env).toBe('production');
    expect(app.config.subdomainOffset).toBe(defaultApplicationConfig.subdomainOffset + 2);
    expect(app.config.proxy).toBe(true);
    expect((app as any).name).toBe(app.config.name);
    expect(app.env).toBe(app.config.env);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.proxy).toBe(!defaultApplicationConfig.proxy);
  });
});
describe('helper methods', () => {
  describe('enableCrashGuard', () => {
    it('should log unhandled promise rejections and stop the process with code 1', async done => {
      expect.assertions(3);
      const mockStream = new Stream.Writable();
      const mockWriteFn = jest.fn();
      const mockExitFn = jest.fn(code => {
        expect(code).toBe(1);
        done();
      });
      mockStream.write = mockWriteFn;
      process.exit = mockExitFn as never;

      const app = new Application({ logStream: mockStream });
      app.enableCrashGuard();
      const listeners = process.listeners('unhandledRejection');
      const handler = process.listeners('unhandledRejection')[listeners.length - 1];

      // Throw mock unhandled promise
      handler.call(
        app,
        new Error('Rejected Promise'),
        new Promise(() => {
          return;
        }),
      );

      // Assertions
      expect(mockWriteFn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFn.mock.calls[0][0])).toEqual(
        expect.objectContaining({
          context: 'application',
          level: 60,
          time: expect.any(Number),
          msg: 'Unhandled Rejected Promise - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          name: defaultApplicationConfig.name,
          instanceId: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Rejected Promise',
            stack: expect.stringMatching('Error: Rejected Promise'),
            type: 'Error',
          }),
          promise: expect.objectContaining({}),
          app: {
            config: {
              env: testEnv,
              instanceId: expect.stringMatching(/.+/),
              name: 'Komapi application',
              proxy: false,
              subdomainOffset: 2,
            },
            state: {
              cache: false,
              locals: {},
              secrets: '****',
            },
          },
        }),
      );

      // Cleanup
      mockWriteFn.mockClear();
      mockExitFn.mockClear();
    });
    it('should log unhandled exceptions and stop the process with code 1', async done => {
      expect.assertions(3);
      const mockStream = new Stream.Writable();
      const mockWriteFn = jest.fn();
      const mockExitFn = jest.fn(code => {
        expect(code).toBe(1);
        done();
      });
      mockStream.write = mockWriteFn;
      process.exit = mockExitFn as never;

      const app = new Application({ logStream: mockStream });
      app.enableCrashGuard();
      const listeners = process.listeners('uncaughtException');
      const handler = process.listeners('uncaughtException')[listeners.length - 1];

      // Throw mock unhandled promise
      handler.call(
        app,
        new Error('Unhandled Exception'),
        new Promise(() => {
          return;
        }),
      );

      // Assertions
      expect(mockWriteFn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFn.mock.calls[0][0])).toEqual(
        expect.objectContaining({
          context: 'application',
          level: 60,
          time: expect.any(Number),
          msg: 'Uncaught Exception Error - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          name: defaultApplicationConfig.name,
          instanceId: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Unhandled Exception',
            stack: expect.stringMatching('Error: Unhandled Exception'),
            type: 'Error',
          }),
          app: {
            config: {
              env: testEnv,
              name: 'Komapi application',
              instanceId: expect.stringMatching(/.+/),
              proxy: false,
              subdomainOffset: 2,
            },
            state: {
              cache: false,
              locals: {},
              secrets: '****',
            },
          },
        }),
      );

      // Cleanup
      mockWriteFn.mockClear();
      mockExitFn.mockClear();
    });
    it('should support custom callback for cleanup of unhandled promise rejections', async done => {
      expect.assertions(5);
      const mockStream = new Stream.Writable();
      const mockWriteFn = jest.fn();
      const mockExitFn = jest.fn(code => {
        expect(code).toBe(1);
        done();
      });
      const errorInstance = new Error('Rejected Promise');
      const promiseInstance = new Promise(() => {
        return;
      });
      mockStream.write = mockWriteFn;
      process.exit = mockExitFn as never;

      const app = new Application({ logStream: mockStream });
      app.enableCrashGuard((err, p) => {
        expect(err).toBe(errorInstance);
        expect(p).toBe(promiseInstance);
      });
      const listeners = process.listeners('unhandledRejection');
      const handler = process.listeners('unhandledRejection')[listeners.length - 1];

      // Throw mock unhandled promise
      handler.call(app, errorInstance, promiseInstance);

      // Assertions
      expect(mockWriteFn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFn.mock.calls[0][0])).toEqual(
        expect.objectContaining({
          context: 'application',
          level: 60,
          time: expect.any(Number),
          msg: 'Unhandled Rejected Promise - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          name: defaultApplicationConfig.name,
          instanceId: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Rejected Promise',
            stack: expect.stringMatching('Error: Rejected Promise'),
            type: 'Error',
          }),
          promise: expect.objectContaining({}),
          app: {
            config: {
              env: testEnv,
              instanceId: expect.stringMatching(/.+/),
              name: 'Komapi application',
              proxy: false,
              subdomainOffset: 2,
            },
            state: {
              cache: false,
              locals: {},
              secrets: '****',
            },
          },
        }),
      );

      // Cleanup
      mockWriteFn.mockClear();
      mockExitFn.mockClear();
    });
    it('should support custom callback for cleanup of unhandled exceptions', async done => {
      expect.assertions(5);
      const mockStream = new Stream.Writable();
      const mockWriteFn = jest.fn();
      const mockExitFn = jest.fn(code => {
        expect(code).toBe(1);
        done();
      });
      const errorInstance = new Error('Unhandled Exception');
      mockStream.write = mockWriteFn;
      process.exit = mockExitFn as never;

      const app = new Application({ logStream: mockStream });
      app.enableCrashGuard((err, p) => {
        expect(err).toBe(errorInstance);
        expect(p).toBe(undefined);
      });
      const listeners = process.listeners('uncaughtException');
      const handler = process.listeners('uncaughtException')[listeners.length - 1];

      // Throw mock unhandled promise
      handler.call(app, errorInstance);

      // Assertions
      expect(mockWriteFn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWriteFn.mock.calls[0][0])).toEqual(
        expect.objectContaining({
          context: 'application',
          level: 60,
          time: expect.any(Number),
          msg: 'Uncaught Exception Error - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          name: defaultApplicationConfig.name,
          instanceId: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Unhandled Exception',
            stack: expect.stringMatching('Error: Unhandled Exception'),
            type: 'Error',
          }),
          app: {
            config: {
              env: testEnv,
              name: 'Komapi application',
              instanceId: expect.stringMatching(/.+/),
              proxy: false,
              subdomainOffset: 2,
            },
            state: {
              cache: false,
              locals: {},
              secrets: '****',
            },
          },
        }),
      );

      // Cleanup
      mockWriteFn.mockClear();
      mockExitFn.mockClear();
    });
  });
});
describe('requests', () => {
  describe('context', () => {
    describe('ctx.reqId', () => {
      it('should exists', async done => {
        expect.assertions(2);
        const app = new Application();

        // Add assertion middleware
        app.use((ctx, next) => {
          expect(ctx.reqId).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
          ctx.body = null;
        });

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(204);

        // Done
        done();
      });
      it('should not trust proxy by default', async done => {
        expect.assertions(3);
        const app = new Application();
        const fakeId = 'random-fake-id';

        // Add assertion middleware
        app.use(ctx => {
          expect(ctx.reqId).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
          expect(ctx.reqId).not.toEqual(fakeId);
          ctx.body = null;
        });

        const response = await request(app.callback())
          .get('/')
          .set('x-request-id', fakeId);

        // Assertions
        expect(response.status).toBe(204);

        // Done
        done();
      });
      it('should trust proxy if app is initiated with proxy trust', async done => {
        expect.assertions(2);
        const app = new Application({ proxy: true });
        const fakeId = 'random-fake-id';

        // Add assertion middleware
        app.use(ctx => {
          expect(ctx.reqId).toEqual(fakeId);
          ctx.body = null;
        });

        const response = await request(app.callback())
          .get('/')
          .set('x-request-id', fakeId);

        // Assertions
        expect(response.status).toBe(204);

        // Done
        done();
      });
    });
    describe('ctx.sendResponse', () => {
      it('should exists', async done => {
        expect.assertions(4);
        const app = new Application();
        const body = { a: 'body', b: 123 };

        // Add assertion middleware
        app.use((ctx, next) => {
          expect(typeof ctx.sendResponse).toBe('function');
          return next();
        });
        app.use(ctx => ctx.sendResponse(body));

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.text).toBe(JSON.stringify(body));
        expect(response.body).toEqual(body);

        // Done
        done();
      });
      it('should support easy promise chaining', async done => {
        const app = new Application();
        const body = { a: 'body', b: 123 };
        app.use(ctx => Promise.resolve(body).then(ctx.sendResponse));

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.text).toBe(JSON.stringify(body));
        expect(response.body).toEqual(body);

        // Done
        done();
      });
      it('should send empty responses with status code 204', async done => {
        const app = new Application();
        const body = null;
        app.use(ctx => ctx.sendResponse(body));

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(204);
        expect(response.text).toBe('');
        expect(response.body).toEqual({});

        // Done
        done();
      });
      it('should have second argument to determine if response should be sent or not', async done => {
        expect.assertions(5);
        const app = new Application();
        const body1 = { a: 'body1', b: 123 };
        const body2 = { a: 'body2', b: 456 };

        // Add assertion middleware
        app.use((ctx, next) => {
          ctx.sendResponse(body1, false);
          expect(ctx.body).toBe(undefined);
          return next();
        });
        app.use((ctx, next) => {
          ctx.sendResponse(body2, true);
          expect(ctx.body).toBe(body2);
          return next();
        });

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.text).toBe(JSON.stringify(body2));
        expect(response.body).toEqual(body2);

        // Done
        done();
      });
    });
  });
});
