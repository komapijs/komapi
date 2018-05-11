// Dependencies
import Application, { requestLogger } from '../../../src';
import request from 'supertest';

// Tests
it('should log requests', async done => {
  expect.assertions(4);
  const app = new Application();
  const spy = jest.fn();
  const expectedData = {
    startAt: expect.any(Date),
    latency: expect.any(Number),
    response: expect.objectContaining({
      status: 200,
    }),
    source: 'requestLogger',
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
