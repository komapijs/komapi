// Dependencies
import Application from '../../../src/lib/Komapi';
import ensureSchema from '../../../src/middlewares/ensureSchema';
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
  const app = new Application();
  const data = {
    id: 1,
    name: 'John Smith',
    isCool: false,
    comment: 'A long comment about this generic person',
  };

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
  expect.assertions(3);
  const app = new Application();
  const data = {
    id: 1,
    name: 'John Smith',
    comment: 'A long comment about this generic person',
  };

  app.use((ctx, next) => {
    (ctx.request as any).body = data; // Hack to inject a body
    return expect(next()).rejects.toThrow('Invalid data provided');
  });
  app.use(ensureSchema(exampleSchema));
  app.use(ctx => {
    ctx.body = 'success';
  });

  const response = await request(app.callback()).get('/');

  // Assertions
  expect(response.status).toBe(404);
  expect(response.text).toBe('Not Found');

  // Done
  done();
});
