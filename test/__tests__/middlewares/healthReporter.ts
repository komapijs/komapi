import request from 'supertest';
import Komapi from '../../../src/lib/Komapi';
import healthReporter from '../../../src/middlewares/healthReporter';

// Tests
it('should follow the spec', async done => {
  expect.assertions(2);
  const app = new Komapi();
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.LifecycleState.STARTED;

  // Add middlewares
  app.use(healthReporter());

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'pass', serviceID: app.config.serviceId });

  // Done
  done();
});
it('should use "app.state" to determine status', async done => {
  expect.assertions(8);
  const app = new Komapi();
  app.middleware = [];

  // Add middlewares
  app.use(healthReporter());

  const server = request(app.callback());

  // Run tests
  app.state = Komapi.LifecycleState.STARTING;
  const response1 = await server.get('/');
  app.state = Komapi.LifecycleState.STARTED;
  const response2 = await server.get('/');
  app.state = Komapi.LifecycleState.STOPPING;
  const response3 = await server.get('/');
  app.state = Komapi.LifecycleState.STOPPED;
  const response4 = await server.get('/');

  // Assertions
  expect(response1.status).toBe(503);
  expect(response1.body).toEqual({
    status: 'fail',
    output: 'Application is not ready',
    serviceID: app.config.serviceId,
  });
  expect(response2.status).toBe(200);
  expect(response2.body).toEqual({ status: 'pass', serviceID: app.config.serviceId });
  expect(response3.status).toBe(503);
  expect(response3.body).toEqual({
    status: 'fail',
    output: 'Application is stopping',
    serviceID: app.config.serviceId,
  });
  expect(response4.status).toBe(503);
  expect(response4.body).toEqual({
    status: 'fail',
    output: 'Application is stopping',
    serviceID: app.config.serviceId,
  });

  // Done
  done();
});
it('should support custom checks', async done => {
  expect.assertions(2);
  const app = new Komapi();
  const checks = () => ({
    status: 'warn' as 'warn',
    output: 'custom output',
    checks: [{ status: 'warn' as 'warn', output: 'custom output2' }],
  });
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.LifecycleState.STARTED;

  // Add middlewares
  app.use(healthReporter({ checks }));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    status: 'warn',
    output: 'custom output',
    serviceID: app.config.serviceId,
    checks: expect.arrayContaining([
      {
        status: 'warn',
        output: 'custom output2',
      },
    ]),
  });

  // Done
  done();
});
it('should support custom asynchronous checks', async done => {
  expect.assertions(2);
  const app = new Komapi();
  const checks = () =>
    new Promise<any>(resolve =>
      setTimeout(
        () =>
          resolve({
            status: 'warn' as 'warn',
            output: 'custom output',
            checks: [{ status: 'warn' as 'warn', output: 'custom output2' }],
          }),
        100,
      ),
    );
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.LifecycleState.STARTED;

  // Add middlewares
  app.use(healthReporter({ checks }));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    status: 'warn',
    output: 'custom output',
    serviceID: app.config.serviceId,
    checks: expect.arrayContaining([
      {
        status: 'warn',
        output: 'custom output2',
      },
    ]),
  });

  // Done
  done();
});
it('should automatically respond 503 on failed checks', async done => {
  expect.assertions(2);
  const app = new Komapi();
  const checks = () => ({ status: 'fail' as 'fail', output: 'failed to prove 503 status' });
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.LifecycleState.STARTED;

  // Add middlewares
  app.use(healthReporter({ checks }));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(503);
  expect(response.body).toEqual({
    status: 'fail',
    output: 'failed to prove 503 status',
    serviceID: app.config.serviceId,
  });

  // Done
  done();
});
