// Imports
import Komapi from '../../../../src/lib/Komapi';
import request from 'supertest';

// Tests
it('should augment koa request, response and context types', async done => {
  expect.assertions(11);
  const app = new Komapi();

  // Add middlewares
  app.use((ctx, next) => {

    // Assertions
    expect(typeof ctx.log).toBe('object');
    expect(typeof ctx.request.requestId).toBe('string');
    expect(typeof ctx.request.startAt).toBe('number');
    expect(typeof ctx.response.send).toBe('function');
    expect(ctx.log).toBe(app.log);
    expect(ctx.requestId).toBe(ctx.request.requestId);
    expect(ctx.startAt).toBe(ctx.request.startAt);
    expect(ctx.send).toBe(ctx.response.send);
    expect(ctx.request.requestId).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    );

    return next();
  });
  app.use(ctx => ctx.send({ status: 'success' }));

  const server = request(app.callback());
  const response = await server.get('/send');

  // Assertions
  expect(response.body).toEqual({ status: 'success' });
  expect(response.status).toBe(200);

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
it('should not trust the x-request-id header if app.proxy != true (by default)', async done => {
  expect.assertions(6);
  const app = new Komapi();

  // Add middlewares
  app.use(ctx => ctx.send(ctx.request.requestId));

  const server = request(app.callback());
  const responses = await Promise.all([
    server.get('/').set('x-request-id', 'req1'),
    server.get('/').set('x-request-id', 'req2'),
  ]);

  // Assertions
  expect(responses[0].status).toBe(200);
  expect(responses[0].text).not.toBe('req1');
  expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
  expect(responses[1].status).toBe(200);
  expect(responses[1].text).not.toBe('req2');
  expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

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
