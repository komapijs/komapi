// Dependencies
import Koa from 'koa';
import request from 'supertest';
import { badRequest, internal } from 'boom';
import errorHandler from '../../../src/middlewares/errorHandler';

// Tests
it('should send 500 and a default error message for thrown errors', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw new Error('My Custom Error Message');
  });

  const response = await request(app.callback())
    .get('/')
    .set('Accept', 'text/plain');

  // Assertions
  expect(response.text).toEqual('An internal server error occurred');
  expect(response.status).toEqual(500);

  // Done
  done();
});
it('should send 500 and a default error message for thrown boom internal server errors', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw internal('My Custom Error Message');
  });

  const response = await request(app.callback())
    .get('/')
    .set('Accept', 'text/plain');

  // Assertions
  expect(response.text).toEqual('An internal server error occurred');
  expect(response.status).toEqual(500);

  // Done
  done();
});
it('should send 400 and the provided error message for thrown boom errors', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw badRequest('My Custom Error Message');
  });

  const response = await request(app.callback())
    .get('/')
    .set('Accept', 'text/plain');

  // Assertions
  expect(response.text).toEqual('My Custom Error Message');
  expect(response.status).toEqual(400);

  // Done
  done();
});
