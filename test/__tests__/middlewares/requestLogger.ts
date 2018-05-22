// Dependencies
import Application, { requestLogger } from '../../../src';
import request from 'supertest';

// Tests
it('should log requests', async done => {
  expect.assertions(4);
  const app = new Application();
  const spy = jest.fn();
  const expectedData = {
    startAt: expect.any(Number),
    latency: expect.any(Number),
    request: expect.objectContaining({
      url: '/',
    }),
    response: expect.objectContaining({
      status: 200,
    }),
  };

  app.use((ctx, next) => {
    ctx.log.info = spy;
    return next();
  });
  app.use(requestLogger());

  app.use(ctx => {
    ctx.body = 'success';
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.text).toBe('success');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(expect.objectContaining(expectedData), 'Request handled');

  // Done
  done();
});

it('should log latency in milliseconds', async done => {
  expect.assertions(2);
  const app = new Application();
  const spy = jest.fn();

  app.use((ctx, next) => {
    ctx.log.info = spy;
    return next();
  });
  app.use(requestLogger());
  app.use((ctx, next) => new Promise(resolve => setTimeout(resolve, 122)).then(next));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0].latency).toBeGreaterThan(121);

  // Done
  done();
});
