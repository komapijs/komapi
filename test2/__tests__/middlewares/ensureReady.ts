// Dependencies
import Komapi from '../../../src/lib/Komapi';
import ensureReady from '../../../src/middlewares/ensureReady';
import errorHandler from '../../../src/middlewares/errorHandler';
import request from 'supertest';

// Tests
it('should not interfere with requests if application is ready', async done => {
  expect.assertions(4);
  const app = new Komapi();
  app.middleware = [];
  const initSpy = jest.fn();
  const logSpy = jest.fn();

  // Mock ready state
  app.state = Komapi.Lifecycle.READY;

  // Add traps
  app.init = initSpy;

  // Add middlewares
  app.use((ctx, next) => {
    // Intercept relevant calls
    ctx.request.log = new Proxy(ctx.request.log, {
      get(obj, prop) {
        return prop === 'warn' ? logSpy : Reflect.get(obj, prop);
      },
    });
    return next();
  });
  app.use(ensureReady());
  app.use(ctx => {
    ctx.body = 'success';
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.text).toBe('success');
  expect(initSpy).not.toHaveBeenCalled();
  expect(logSpy).not.toHaveBeenCalled();

  // Done
  done();
});
it('should automatically invoke `app.init()` on the first request when application is in setup state while receiving requests', async done => {
  expect.assertions(10);
  const app = new Komapi();
  app.middleware = [];
  app.onInit(
    async () =>
      new Promise(resolve => {
        expect(true).toBe(true);
        setTimeout(resolve, 100);
      }),
  );
  const initSpy = jest.fn(app.init.bind(app));
  const logSpy = jest.fn();

  // Add traps
  app.init = initSpy;

  // Add middlewares
  app.use(ensureReady());
  app.use((ctx, next) => {
    if (ctx.app.state !== Komapi.Lifecycle.READY) {
      fail('should not serve requests before app is ready');
    }
    return next();
  });
  app.use(ctx => {
    ctx.body = 'success';
  });
  app.middleware.unshift((ctx, next) => {
    ctx.log = new Proxy(app.log, {
      get(obj, prop) {
        return prop === 'warn' ? logSpy : Reflect.get(obj, prop);
      },
    });
    return next();
  });
  const server = request(app.callback());
  const responses = await Promise.all([server.get('/'), server.get('/'), server.get('/')]);

  // Assertions
  expect(responses[0].status).toBe(200);
  expect(responses[0].text).toBe('success');
  expect(responses[1].status).toBe(200);
  expect(responses[1].text).toBe('success');
  expect(responses[2].status).toBe(200);
  expect(responses[2].text).toBe('success');
  expect(initSpy).toHaveBeenCalledTimes(1);
  expect(logSpy).toHaveBeenCalledTimes(1);
  expect(logSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      app,
    }),
    `Application is in \`${
      Komapi.Lifecycle.SETUP
    }\` state. Invoking \`app.init()\` automatically before serving this request. It is highly recommended to run \`app.init()\` before accepting requests through e.g. \`app.listen()\``,
  );

  // Done
  done();
});
it('should reject new requests if app is in closing state', async done => {
  expect.assertions(2);
  const app = new Komapi({ config: { env: 'production' } });
  app.middleware = [];
  app.state = Komapi.Lifecycle.CLOSING;

  // Add middlewares
  app.use(ensureReady());
  app.use((ctx, next) => {
    fail('should not serve requests');
    return next();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.text).toBe('Internal Server Error');

  // Done
  done();
});
it('should reject new requests if app is in closed state', async done => {
  expect.assertions(2);
  const app = new Komapi({ config: { env: 'production' } });
  app.middleware = [];
  app.state = Komapi.Lifecycle.CLOSED;

  // Add middlewares
  app.use(ensureReady());
  app.use((ctx, next) => {
    fail('should not serve requests');
    return next();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.text).toBe('Internal Server Error');

  // Done
  done();
});
it('should integrate nicely with Komapi error handler', async done => {
  expect.assertions(3);
  const app = new Komapi();
  app.middleware = [];
  app.state = Komapi.Lifecycle.CLOSED;

  // Add middlewares
  app.use(errorHandler());
  app.use(ensureReady());
  app.use((ctx, next) => {
    fail('should not serve requests');
    return next();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(503);
  expect(response.status).toBe(503);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {
        stack: expect.stringContaining('Error: Application is closing'),
      },
      code: '',
      error: 'Service Unavailable',
      message: 'Application is closing',
      status: 503,
    },
  });

  // Done
  done();
});
