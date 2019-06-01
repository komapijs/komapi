// Dependencies
import request from 'supertest';
import Koa from 'koa';
import cls from 'cls-hooked';
import setTransactionContext from '../../../src/middlewares/setTransactionContext';

// Tests
it('should set requestId automatically and capture custom properties', async done => {
  expect.assertions(3);
  const app = new Koa();
  const ns = cls.createNamespace('my-namespace');

  // Add middlewares
  app.use((ctx, next) => {
    // Add mock data
    ctx.request.requestId = ctx.request.headers['x-request-id'];
    return next();
  });
  app.use(setTransactionContext(ns));
  app.use((ctx, next) => {
    ns.set('delay', ctx.request.headers['x-delay']);
    return next();
  });
  app.use(async ctx => {
    await new Promise(resolve => setTimeout(resolve, parseInt(ctx.request.headers['x-delay'], 10)));
    ctx.body = {
      requestId: ns.get('requestId'),
      delay: ns.get('delay'),
    };
  });

  const server = request(app.callback());
  const responses = await Promise.all([
    server
      .get('/')
      .set('x-request-id', '1')
      .set('x-delay', '100'),
    server
      .get('/')
      .set('x-request-id', '2')
      .set('x-delay', '1'),
    server
      .get('/')
      .set('x-request-id', '3')
      .set('x-delay', '50'),
  ]);

  // Assertions
  expect(responses[0].body).toEqual({
    requestId: '1',
    delay: '100',
  });
  expect(responses[1].body).toEqual({
    requestId: '2',
    delay: '1',
  });
  expect(responses[2].body).toEqual({
    requestId: '3',
    delay: '50',
  });

  // Done
  done();
});
