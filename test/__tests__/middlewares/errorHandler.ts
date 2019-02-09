// Dependencies
import Koa from 'koa';
import request from 'supertest';
import errorHandler from '../../../src/middlewares/errorHandler';

// Tests
it('should send 500 and the error message for thrown errors', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw new Error('My Custom Error Message');
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.text).toEqual('My Custom Error Message');
  expect(response.status).toEqual(500);

  // Done
  done();
});
