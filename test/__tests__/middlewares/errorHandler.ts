// Dependencies
import Application from '../../../src/lib/Komapi';
import errorHandler from '../../../src/middlewares/errorHandler';
import request from 'supertest';
import { unauthorized } from 'boom';

// Tests
it('should encapsulate generic errors', async done => {
  expect.assertions(2);
  const app = new Application();
  app.use(errorHandler());
  app.use(ctx => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: expect.objectContaining({
      code: '',
      status: 500,
      message: 'An internal server error occurred',
      stack: expect.arrayContaining([]),
    }),
  });

  // Done
  done();
});
it('should hide stack traces in production', async done => {
  expect.assertions(2);
  const app = new Application({ env: 'production', logOptions: { level: 'error' } });
  app.use(errorHandler());
  app.use(() => {
    throw new Error('A custom error');
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: {
      code: '',
      status: 500,
      message: 'An internal server error occurred',
    },
  });

  // Done
  done();
});
it('should forward boom errors directly', async done => {
  expect.assertions(2);
  const app = new Application();
  app.use(errorHandler());
  app.use(() => {
    throw unauthorized();
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: {
      code: '',
      status: 401,
      message: 'Unauthorized',
    },
  });

  // Done
  done();
});
