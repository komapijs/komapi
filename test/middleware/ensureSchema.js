// Dependencies
import test from 'ava';
import { agent as request } from 'supertest-as-promised';
import Komapi from '../../src/index';

// Init
const schema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Test schema',
  type: 'object',
  properties: {
    enumvalue: {
      description: 'Environment',
      type: 'string',
      enum: [
        'development',
        'production',
      ],
    },
    stringvalue: {
      description: 'Should be string',
      type: 'string',
    },
    numbervalue: {
      description: 'Should be string',
      type: 'string',
    },
  },
  additionalProperties: false,
  required: [
    'stringvalue',
    'enumvalue',
  ],
};

// Tests
test('provides middleware to ensure requests adheres to a json schema', async (t) => {
  t.plan(2);
  const app = new Komapi({ env: 'production' });
  app.use(async (ctx, next) => {
    // eslint-disable-next-line no-param-reassign
    ctx.request.body = { stringvalue: [] };
    try {
      return await next();
    } catch (err) {
      t.is(err.isBoom, true);
      t.deepEqual(err.errors, [{
        path: '/enumvalue',
        keyword: 'required',
        message: 'should be present',
        data: null,
        metadata: {
          keyword: 'required',
          dataPath: '',
          schemaPath: '#/required',
          params: { missingProperty: 'enumvalue' },
          message: 'should have required property \'enumvalue\'',
          schema: {
            enumvalue: {
              description: 'Environment',
              type: 'string',
              enum: [
                'development',
                'production',
              ],
            },
            stringvalue: { description: 'Should be string', type: 'string' },
            numbervalue: { description: 'Should be string', type: 'string' },
          },
          parentSchema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            title: 'Test schema',
            type: 'object',
            properties: {
              enumvalue: {
                description: 'Environment',
                type: 'string',
                enum: [
                  'development',
                  'production',
                ],
              },
              stringvalue: { description: 'Should be string', type: 'string' },
              numbervalue: { description: 'Should be string', type: 'string' },
            },
            additionalProperties: false,
            required: ['stringvalue', 'enumvalue'],
          },
          data: {
            stringvalue: [],
          },
        },
      },
      {
        path: '/stringvalue',
        keyword: 'type',
        message: 'should be string',
        data: [],
        metadata: {
          keyword: 'type',
          dataPath: '/stringvalue',
          schemaPath: '#/properties/stringvalue/type',
          params: { type: 'string' },
          message: 'should be string',
          schema: 'string',
          parentSchema: { description: 'Should be string', type: 'string' },
          data: [],
        },
      }]);
      throw err;
    }
  });
  app.use(app.mw.ensureSchema(schema));
  await request(app.listen())
    .get('/');
});
test('allows valid requests', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(async (ctx, next) => {
    // eslint-disable-next-line no-param-reassign
    ctx.request.body = {
      stringvalue: 'asd',
      enumvalue: 'development',
    };
    try {
      return await next();
    } catch (err) {
      t.fail();
      throw err;
    }
  });
  app.use(app.mw.ensureSchema(schema));
  app.use(ctx => ctx.send(null));
  const res = await request(app.listen())
    .get('/');
  t.is(res.status, 204);
});
test('throws on invalid key', async (t) => {
  const app = new Komapi({ env: 'production' });
  t.throws(() => {
    app.use(app.mw.ensureSchema(schema, { key: 'invalid' }));
  }, /Invalid config provided/);
});
test('replies with schema on ?$schema by default', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(app.mw.ensureSchema(schema));
  app.use(ctx => ctx.send(null));
  const res = await request(app.listen())
    .get('/?$schema');
  t.is(res.status, 200);
  t.deepEqual(res.body, schema);
});
test('support custom schema reply function', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(app.mw.ensureSchema(schema, {
    sendSchema: ctx => (ctx.request.query.test === 'blah'),
  }));
  app.use(ctx => ctx.send(null));
  const res = await request(app.listen())
    .get('/?test=blah');
  t.is(res.status, 200);
  t.deepEqual(res.body, schema);
});
test('can be disabled', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(app.mw.ensureSchema(schema, { sendSchema: false }));
  app.use(ctx => ctx.send(null));
  const res = await request(app.listen())
    .get('/?$schema');
  t.is(res.status, 400);
});
