// Dependencies
import Stream from 'stream';
import request from 'supertest';
import Application from '../../../src/lib/Komapi';

// Init
const testEnv = process.env.NODE_ENV;
const defaultApplicationConfig = {
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
    expect(app.env).toEqual(defaultApplicationConfig.env);
    expect(app.proxy).toEqual(defaultApplicationConfig.proxy);
    expect(app.subdomainOffset).toEqual(defaultApplicationConfig.subdomainOffset);
  });
  it('should support partial application config', () => {
    const app = new Application({ subdomainOffset: 8 });

    // Assertions
    expect(app.env).toEqual(defaultApplicationConfig.env);
    expect(app.proxy).toEqual(defaultApplicationConfig.proxy);
    expect(app.subdomainOffset).toEqual(8);
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
    expect(app.env).toBe('development');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFn.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        level: 40,
        time: expect.any(Number),
        msg:
          "NODE_ENV environment mismatch. Your application has been instantiated with '{ env: 'development' }' while 'process.env.NODE_ENV = undefined'. It is recommended to start your application with '{ env: process.env.NODE_ENV }' and set the correct environment using the NODE_ENV environment variable.",
        pid: expect.any(Number),
        hostname: expect.stringMatching(/.+/),
        env: 'development',
      }),
    );
    expect(JSON.parse(mockFn.mock.calls[0][0])).not.toHaveProperty('NODE_ENV');

    // Cleanup
    mockFn.mockClear();
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
          level: 60,
          time: expect.any(Number),
          msg: 'Unhandled Rejected Promise - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Rejected Promise',
            stack: expect.stringMatching('Error: Rejected Promise'),
            type: 'Error',
          }),
          promise: expect.objectContaining({}),
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
          level: 60,
          time: expect.any(Number),
          msg: 'Uncaught Exception Error - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Unhandled Exception',
            stack: expect.stringMatching('Error: Unhandled Exception'),
            type: 'Error',
          }),
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
          level: 60,
          time: expect.any(Number),
          msg: 'Unhandled Rejected Promise - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Rejected Promise',
            stack: expect.stringMatching('Error: Rejected Promise'),
            type: 'Error',
          }),
          promise: expect.objectContaining({}),
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
          level: 60,
          time: expect.any(Number),
          msg: 'Uncaught Exception Error - Stopping application to prevent instability',
          pid: expect.any(Number),
          hostname: expect.stringMatching(/.+/),
          env: testEnv,
          err: expect.objectContaining({
            message: 'Unhandled Exception',
            stack: expect.stringMatching('Error: Unhandled Exception'),
            type: 'Error',
          }),
        }),
      );

      // Cleanup
      mockWriteFn.mockClear();
      mockExitFn.mockClear();
    });
  });
});
describe('request context', () => {
  describe('request', () => {
    describe('requestId', () => {
      it('should exists with shortcut on ctx', async done => {
        expect.assertions(4);
        const app = new Application();

        // Add assertion middleware
        app.use((ctx, next) => {
          expect(ctx.request.requestId).toMatch(
            /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
          );
          expect(ctx.requestId).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
          expect(ctx.requestId).toBe(ctx.request.requestId);
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
          expect(ctx.requestId).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
          expect(ctx.requestId).not.toEqual(fakeId);
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
          expect(ctx.requestId).toEqual(fakeId);
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
  });
  describe('response', () => {
    describe('send', () => {
      it('should exists with shortcut on ctx', async done => {
        expect.assertions(6);
        const app = new Application();
        const body = { a: 'body', b: 123 };

        // Add assertion middleware
        app.use((ctx, next) => {
          expect(typeof ctx.response.send).toBe('function');
          expect(typeof ctx.send).toBe('function');
          expect(ctx.send).toBe(ctx.response.send);
          return next();
        });
        app.use(ctx => ctx.send(body));

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
        app.use(ctx => Promise.resolve(body).then(ctx.send));

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.text).toBe(JSON.stringify(body));
        expect(response.body).toEqual(body);

        // Done
        done();
      });
      it('should send status code 204 for empty responses', async done => {
        const app = new Application();
        const body = null;
        app.use(ctx => ctx.send(body));

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.status).toBe(204);
        expect(response.text).toBe('');
        expect(response.body).toEqual({});

        // Done
        done();
      });
    });
  });
});
