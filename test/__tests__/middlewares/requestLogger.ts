// Dependencies
import request from 'supertest';
import Koa from 'koa';
import requestLogger from '../../../src/middlewares/requestLogger';

// Tests
it('should log requests', async done => {
  expect.assertions(4);
  const app = new Koa();
  const spy = jest.fn();
  const expectedData = {
    latency: expect.any(Number),
    request: expect.objectContaining({
      startAt: expect.any(Number),
      url: '/',
    }),
    response: expect.objectContaining({
      status: 200,
    }),
  };

  // Add middlewares
  app.use((ctx, next) => {
    // Add mock data
    ctx.request.startAt = Date.now();
    ctx.log = { info: spy } as any;
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
  expect.assertions(3);
  const app = new Koa();
  const spy = jest.fn();

  // Add middlewares
  app.use((ctx, next) => {
    // Add mock data
    ctx.request.startAt = Date.now();
    ctx.log = { info: spy } as any;
    return next();
  });
  app.use(requestLogger());
  app.use((ctx, next) => new Promise(resolve => setTimeout(resolve, 125)).then(next));

  await request(app.callback()).get('/');

  // Assertions
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0].latency).toBeGreaterThan(120);
  expect(spy.mock.calls[0][0].latency).toBeLessThan(1200);

  // Done
  done();
});

it('should support custom log level', async done => {
  expect.assertions(5);
  const app = new Koa();
  const infoSpy = jest.fn();
  const traceSpy = jest.fn();
  const expectedData = {
    latency: expect.any(Number),
    request: expect.objectContaining({
      startAt: expect.any(Number),
      url: '/',
    }),
    response: expect.objectContaining({
      status: 200,
    }),
  };

  // Add middlewares
  app.use((ctx, next) => {
    // Add mock data
    ctx.request.startAt = Date.now();
    ctx.log = { info: infoSpy, trace: traceSpy } as any;
    return next();
  });
  app.use(requestLogger({ level: 'trace' }));

  app.use(ctx => {
    ctx.body = 'success';
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.text).toBe('success');
  expect(infoSpy).not.toHaveBeenCalled();
  expect(traceSpy).toHaveBeenCalledTimes(1);
  expect(traceSpy).toHaveBeenCalledWith(expect.objectContaining(expectedData), 'Request handled');

  // Done
  done();
});
