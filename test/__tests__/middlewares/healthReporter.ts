// Dependencies
import Komapi from '../../../src/lib/Komapi';
import healthReporter from '../../../src/middlewares/healthReporter';
import request from 'supertest';

// Tests
it('should attach to /.well_known/_health by default', async done => {
  expect.assertions(4);
  const app = new Komapi();
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.Lifecycle.READY;

  // Add middlewares
  app.use(healthReporter());

  const server = request(app.callback());
  const response404 = await server.get('/');
  const response200 = await server.get('/.well_known/_health');

  // Assertions
  expect(response404.status).toBe(404);
  expect(response404.text).toEqual('Not Found');
  expect(response200.status).toBe(200);
  expect(response200.body).toEqual({ status: 'pass', serviceID: app.config.instanceId });

  // Done
  done();
});
it('should attach to custom paths', async done => {
  expect.assertions(6);
  const app = new Komapi();
  app.middleware = [];

  // Mock ready state
  app.state = Komapi.Lifecycle.READY;

  // Add middlewares
  app.use(healthReporter('/my-path'));

  const server = request(app.callback());
  const response404 = await server.get('/');
  const response4042 = await server.get('/.well_known/_health');
  const response200 = await server.get('/my-path');

  // Assertions
  expect(response404.status).toBe(404);
  expect(response404.text).toEqual('Not Found');
  expect(response4042.status).toBe(404);
  expect(response4042.text).toEqual('Not Found');
  expect(response200.status).toBe(200);
  expect(response200.body).toEqual({ status: 'pass', serviceID: app.config.instanceId });

  // Done
  done();
});
it('should use "app.state" to determine status', async done => {
  expect.assertions(12);
  const app = new Komapi();
  app.middleware = [];

  // Add middlewares
  app.use(healthReporter());

  const server = request(app.callback());

  // Run tests
  app.state = Komapi.Lifecycle.SETUP;
  const response1 = await server.get('/.well_known/_health');
  app.state = Komapi.Lifecycle.READYING;
  const response2 = await server.get('/.well_known/_health');
  app.state = Komapi.Lifecycle.READY;
  const response3 = await server.get('/.well_known/_health');
  app.state = Komapi.Lifecycle.CLOSING;
  const response4 = await server.get('/.well_known/_health');
  app.state = Komapi.Lifecycle.CLOSED;
  const response5 = await server.get('/.well_known/_health');
  app.state = 'UNKNOWN' as Komapi.Lifecycle.CLOSED;
  const response6 = await server.get('/.well_known/_health');

  // Assertions
  expect(response1.status).toBe(503);
  expect(response1.body).toEqual({
    status: 'fail',
    output: 'Application is not ready',
    serviceID: app.config.instanceId,
  });
  expect(response2.status).toBe(503);
  expect(response2.body).toEqual({
    status: 'fail',
    output: 'Application is not ready',
    serviceID: app.config.instanceId,
  });
  expect(response3.status).toBe(200);
  expect(response3.body).toEqual({ status: 'pass', serviceID: app.config.instanceId });
  expect(response4.status).toBe(503);
  expect(response4.body).toEqual({
    status: 'fail',
    output: 'Application is shutting down',
    serviceID: app.config.instanceId,
  });
  expect(response5.status).toBe(503);
  expect(response5.body).toEqual({
    status: 'fail',
    output: 'Application is shutting down',
    serviceID: app.config.instanceId,
  });
  expect(response6.status).toBe(503);
  expect(response6.body).toEqual({
    status: 'fail',
    serviceID: app.config.instanceId,
  });

  // Done
  done();
});
