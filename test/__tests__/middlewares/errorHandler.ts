// Imports
import Koa from 'koa';
import errorHandler from '../../../src/middlewares/errorHandler';
import request from 'supertest';
import { unauthorized } from 'boom';

// Tests
it('should encapsulate generic errors', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(ctx => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {
        stack: expect.stringContaining('Error: A custom error'),
      },
      code: '',
      error: 'Internal Server Error',
      message: 'An internal server error occurred',
      status: 500,
    },
  });

  // Done
  done();
});
it('should respond with text if requested', async done => {
  expect.assertions(3);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(ctx => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback())
    .get('/')
    .set('Accept', 'text/plain,application/xml');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.text).toEqual('An internal server error occurred');
  expect(response.body).toEqual({});

  // Done
  done();
});
it('should respond 406 using text for no acceptable response types', async done => {
  expect.assertions(3);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(ctx => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback())
    .get('/')
    .set('Accept', 'application/xml');

  // Assertions
  expect(response.status).toBe(406);
  expect(response.text).toEqual('Not Acceptable');
  expect(response.body).toEqual({});

  // Done
  done();
});
it('should not interfere with successful requests', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(ctx => {
    ctx.body = 'success';
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(200);
  expect(response.text).toBe('success');

  // Done
  done();
});
it('should hide "additionalDevelopmentData" in production', async done => {
  expect.assertions(2);
  const app = new Koa();
  app.env = 'production';

  // Add middlewares
  app.use(errorHandler());
  app.use(ctx => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: {
      code: '',
      error: 'Internal Server Error',
      message: 'An internal server error occurred',
      status: 500,
    },
  });

  // Done
  done();
});
it('should provide a nice 404 handler', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {},
      code: '',
      error: 'Not Found',
      message: 'Not Found',
      status: 404,
    },
  });

  // Done
  done();
});
it('should forward boom errors directly', async done => {
  expect.assertions(2);
  const app = new Koa();

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw unauthorized();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {},
      code: '',
      error: 'Unauthorized',
      message: 'Unauthorized',
      status: 401,
    },
  });

  // Done
  done();
});
it('should gracefully fail if provided a non-error', async done => {
  expect.assertions(2);
  const app = new Koa();
  class InvalidError {}

  // Add middlewares
  app.use(errorHandler());
  app.use(() => {
    throw new InvalidError();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {
        stack: expect.stringContaining('Error: Cannot handle non-errors as errors'),
      },
      code: '',
      error: 'Internal Server Error',
      message: 'An internal server error occurred',
      status: 500,
    },
  });

  // Done
  done();
});
