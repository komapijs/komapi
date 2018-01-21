// Dependencies
import test from 'ava';
import { agent as request } from 'supertest';
import Boom from 'boom';
import _ from 'lodash';
import Komapi from '../../src/index';

// Init
const defaultErrorResponse = {
  error: {
    code: '',
    status: 500,
    message: 'An internal server error occurred',
  },
};
const schema = {
  $schema: 'http://json-schema.org/draft-06/schema#',
  title: 'Test schema',
  type: 'object',
  properties: {
    stringvalue: {
      description: 'Should be string',
      type: 'string',
    },
  },
  additionalProperties: false,
  required: [
    'stringvalue',
  ],
};

// Tests
test('uses JSON as default', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw new Error('Dummy error');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 500);
  t.deepEqual(res.body, defaultErrorResponse);
});
test('supports text when JSON is unacceptable', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw new Error('Dummy error');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', 'text/plain,application/xml');
  t.is(res.status, 500);
  t.deepEqual(res.body, {});
  t.is(res.text, JSON.stringify(defaultErrorResponse, null, 2));
});
test('responds with 406 using text for no acceptable response types', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw new Error('Dummy error');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', 'text/html,application/xml');
  t.is(res.status, 406);
  t.deepEqual(res.text, 'Error: Not Acceptable');
});
test('does not provide stacktraces in production', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw new Error('Dummy error');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 500);
  t.is(res.body.error.stack, undefined);
});
test('provides stacktraces in development', async (t) => {
  const app = new Komapi({ env: 'development' });
  let stack;
  app.use(() => {
    const err = new Error('Dummy error');
    stack = err.stack; // eslint-disable-line prefer-destructuring
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 500);
  const defaultError = _.cloneDeep(defaultErrorResponse);
  defaultError.error.stack = stack.split('\n');
  t.deepEqual(res.body, defaultError);
});
test('provides stacktraces in test', async (t) => {
  const app = new Komapi({ env: 'test' });
  let stack;
  app.use(() => {
    const err = new Error('Dummy error');
    stack = err.stack; // eslint-disable-line prefer-destructuring
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 500);
  const defaultError = _.cloneDeep(defaultErrorResponse);
  defaultError.error.stack = stack.split('\n');
  t.deepEqual(res.body, defaultError);
});
test('handles stacktraces in array format', async (t) => {
  const app = new Komapi({ env: 'development' });
  let stack;
  app.use(() => {
    const err = new Error('Dummy error');
    stack = err.stack; // eslint-disable-line prefer-destructuring
    err.stack = err.stack.split('\n');
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 500);
  const defaultError = _.cloneDeep(defaultErrorResponse);
  defaultError.error.stack = stack.split('\n');
  t.deepEqual(res.body, defaultError);
});
test('supports custom headers when using JSON', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw Boom.unauthorized('invalid password', 'sample');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 401);
  t.deepEqual(res.body, {
    error: {
      code: '',
      status: 401,
      message: 'invalid password',
    },
  });
  t.is(res.headers['www-authenticate'], 'sample error="invalid password"');
});
test('supports custom headers when using text', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    throw Boom.unauthorized('invalid password', 'sample');
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', 'text/plain,application/xml');
  t.is(res.status, 401);
  t.deepEqual(res.body, {});
  t.is(res.text, JSON.stringify({
    error: {
      code: '',
      status: 401,
      message: 'invalid password',
    },
  }, null, 2));
  t.is(res.headers['www-authenticate'], 'sample error="invalid password"');
});
test('handles built in schema validation middleware exceptions', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use((ctx, next) => {
    // eslint-disable-next-line no-param-reassign
    ctx.request.body = { stringvalue: [] };
    return next();
  });
  app.use(app.mw.ensureSchema(schema));
  const res = await request(app.listen())
    .get('/');
  t.is(res.status, 400);
  t.deepEqual(res.body, {
    error: {
      code: '',
      status: 400,
      message: 'Invalid data provided',
      errors: [
        {
          path: '/stringvalue',
          keyword: 'type',
          message: 'should be string',
          data: [],
        },
      ],
    },
  });
});
test('handles invalid error objects gracefully', async (t) => {
  const app = new Komapi({ env: 'development' });
  class InvalidError {
    constructor() {
      this.something = 'value';
    }
  }
  app.use(() => {
    throw new InvalidError();
  });
  const res = await request(app.listen())
    .get('/');
  t.is(res.status, 500);
  t.is(res.body.error.message, 'An internal server error occurred');
  t.is(res.body.error.stack[0], 'Error: Cannot handle non-errors as errors!');
});
test('allows error status codes', async (t) => {
  const app = new Komapi({ env: 'production' });
  const customResponse = 'Custom Text';
  app.use((ctx) => {
    ctx.status = 400;
    ctx.body = customResponse;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 400);
  t.deepEqual(res.text, customResponse);
});
test('allows custom error status codes on error.status', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    const err = new Error('Custom Error Message');
    err.status = 400;
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 400);
  t.deepEqual(res.body, { error: { code: '', status: 400, message: 'Custom Error Message' } });
});
test('allows custom error status codes on error.statusCode', async (t) => {
  const app = new Komapi({ env: 'production' });
  app.use(() => {
    const err = new Error();
    err.statusCode = 400;
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 400);
  t.deepEqual(res.body, { error: { code: '', status: 400, message: 'Bad Request' } });
});
test('allows custom errors with data in development', async (t) => {
  const app = new Komapi({ env: 'development' });
  const data = {
    key1: [{
      message: '...',
      keyword: 'required',
      params: null,
    }, {
      message: '...',
      keyword: '...',
      params: null,
    }],
  };
  app.use(() => {
    const err = new Error();
    err.statusCode = 400;
    err.data = data;
    throw err;
  });
  const res = await request(app.listen())
    .get('/')
    .set('Accept', '*/*');
  t.is(res.status, 400);
  t.deepEqual(res.body, {
    error: {
      code: '',
      status: 400,
      message: 'Bad Request',
      data,
    },
  });
});
