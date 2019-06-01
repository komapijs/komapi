// Dependencies
import request from 'supertest';
import Komapi from '../../fixtures/Komapi';
import ensureReady from '../../../src/middlewares/ensureStarted';

// Tests
it('should not interfere with requests if application is started', async done => {
  expect.assertions(4);
  const app = new Komapi();
  app.middleware = [];
  const startSpy = jest.fn();
  const logSpy = jest.fn();

  // Mock ready state
  app.state = Komapi.LifecycleState.STARTED;

  // Add traps
  app.start = startSpy;

  // Add middlewares
  app.use((ctx, next) => {
    // Intercept relevant calls
    ctx.log = new Proxy(ctx.log, {
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
  expect(startSpy).not.toHaveBeenCalled();
  expect(logSpy).not.toHaveBeenCalled();

  // Done
  done();
});
it('should automatically invoke `app.start()` on the first request when application is in STOPPED state while receiving requests', async done => {
  expect.assertions(10);
  const app = new Komapi();
  app.middleware = [];
  const startSpy = jest.fn(
    () =>
      new Promise(resolve => {
        expect(true).toBe(true);
        setTimeout(resolve, 100);
      }),
  );
  app.addLifecycleHandler({ start: startSpy });
  const logSpy = jest.fn();

  // Add middlewares
  app.use(ensureReady());
  app.use((ctx, next) => {
    if (ctx.app.state !== Komapi.LifecycleState.STARTED) {
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
  expect(startSpy).toHaveBeenCalledTimes(1);
  expect(logSpy).toHaveBeenCalledTimes(1);
  expect(logSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      app,
    }),
    `Application is in \`${
      Komapi.LifecycleState.STOPPED
    }\` state. Invoking \`app.start()\` automatically before serving this request. It is highly recommended to run \`app.start()\` before accepting requests through e.g. \`app.listen()\``,
  );

  // Done
  done();
});
it('should reject new requests if app is in STOPPING state', async done => {
  expect.assertions(2);
  const app = new Komapi({ config: { env: 'production' } });
  app.middleware = [];
  app.state = Komapi.LifecycleState.STOPPING;

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
// TODO: Implement?
// it('should integrate nicely with Komapi error handler', async done => {
//   expect.assertions(3);
//   const app = new Komapi();
//   app.middleware = [];
//   app.state = Komapi.Lifecycle.CLOSED;
//
//   // Add middlewares
//   app.use(errorHandler());
//   app.use(ensureReady());
//   app.use((ctx, next) => {
//     fail('should not serve requests');
//     return next();
//   });
//
//   const response = await request(app.callback()).get('/');
//
//   // Assertions
//   expect(response.status).toBe(503);
//   expect(response.status).toBe(503);
//   expect(response.body).toEqual({
//     error: {
//       additionalDevelopmentData: {
//         stack: expect.stringContaining('Error: Application is closing'),
//       },
//       code: '',
//       error: 'Service Unavailable',
//       message: 'Application is closing',
//       status: 503,
//     },
//   });
//
//   // Done
//   done();
// });
