// Imports
import Koa from 'koa';
import ensureSchema from '../../../src/middlewares/ensureSchema';
import errorHandler from '../../../src/middlewares/errorHandler';
import request from 'supertest';

// Init
const exampleSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  title: 'Example schema',
  required: ['id', 'name', 'isCool'],
  type: 'object',
  properties: {
    id: {
      description: 'Unique identifier',
      type: 'integer',
    },
    name: {
      description: 'Name of a person',
      type: 'string',
    },
    isCool: {
      description: 'Is this person cool?',
      type: 'boolean',
    },
    comment: {
      description: 'Some comment about this person',
      type: 'string',
    },
  },
};

// Tests
it('should accept valid data', async done => {
  expect.assertions(2);
  const app = new Koa();
  const data = {
    id: 1,
    name: 'John Smith',
    isCool: false,
    comment: 'A long comment about this generic person',
  };

  // Add middlewares
  app.use((ctx, next) => {
    (ctx.request as any).body = data; // Hack to inject a body
    return next();
  });
  app.use(ensureSchema(exampleSchema));
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
it('should reject invalid data', async done => {
  expect.assertions(2);
  const app = new Koa();
  const data = {
    id: 1,
    name: 'John Smith',
    comment: 'A long comment about this generic person',
  };

  // Add middlewares
  app.use((ctx, next) => {
    (ctx.request as any).body = data; // Hack to inject a body
    return expect(next()).rejects.toThrow('Invalid data provided');
  });
  app.use(ensureSchema(exampleSchema));
  app.use(ctx => fail('should not continue requests'));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(404); // 404 because we do not let the exception bubble up from the assertion

  // Done
  done();
});
it('should reject invalid data and stop request cycle', async done => {
  expect.assertions(2);
  const app = new Koa();
  const data = {
    id: 1,
    name: 'John Smith',
    comment: 'A long comment about this generic person',
  };

  // Add middlewares
  app.use((ctx, next) => {
    (ctx.request as any).body = data; // Hack to inject a body
    return next();
  });
  app.use(ensureSchema(exampleSchema));
  app.use(ctx => fail('should not continue requests'));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(500);
  expect(response.text).toEqual('Internal Server Error');

  // Done
  done();
});
it('should integrate nicely with Komapi error handler', async done => {
  expect.assertions(2);
  const app = new Koa();
  const data = {
    id: 1,
    name: 'John Smith',
    comment: 'A long comment about this generic person',
  };

  // Add middlewares
  app.use(errorHandler());
  app.use((ctx, next) => {
    (ctx.request as any).body = data; // Hack to inject a body
    return next();
  });
  app.use(ensureSchema(exampleSchema));
  app.use(ctx => fail('should not continue requests'));

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    error: {
      additionalDevelopmentData: {
        data: {
          errors: [{ dataPath: '/isCool', keyword: 'required', message: 'is a required property' }],
          schema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            properties: {
              comment: { description: 'Some comment about this person', type: 'string' },
              id: { description: 'Unique identifier', type: 'integer' },
              isCool: { description: 'Is this person cool?', type: 'boolean' },
              name: { description: 'Name of a person', type: 'string' },
            },
            required: ['id', 'name', 'isCool'],
            title: 'Example schema',
            type: 'object',
          },
          validatedData: { comment: 'A long comment about this generic person', id: 1, name: 'John Smith' },
        },
      },
      code: '',
      error: 'Bad Request',
      errors: [{ dataPath: '/isCool', keyword: 'required', message: 'is a required property' }],
      message: 'Invalid data provided',
      status: 400,
    },
  });

  // Done
  done();
});
