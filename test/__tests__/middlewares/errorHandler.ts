// Dependencies
import Koa from 'koa';
import request from 'supertest';
import { badRequest, boomify, internal, unauthorized } from 'boom';
import errorHandler from '../../../src/middlewares/errorHandler';
import VError = require('verror');
import { MultiError, WError } from 'verror';

// Tests
describe('generic errors', () => {
  it('should send 500 and a default error message', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new Error('My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
        },
      ],
    });
    expect(response.status).toEqual(500);

    // Done
    done();
  });
});
describe('Boom errors', () => {
  it('should send 500 and a default error message for internal server errors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw internal('My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
        },
      ],
    });
    expect(response.status).toEqual(500);

    // Done
    done();
  });
  it('should send 400 and the provided error message for bad request errors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw badRequest('My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '400',
          title: 'Bad Request',
          detail: 'My Custom Error Message',
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should send 401 and the provided error message and scheme for unauthorized', async done => {
    expect.assertions(4);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw unauthorized('My Custom Unauthorized Message', 'my-scheme');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.header['www-authenticate']).toEqual('my-scheme error="My Custom Unauthorized Message"');
    expect(response.body).toEqual({
      errors: [
        {
          status: '401',
          title: 'Unauthorized',
          detail: 'My Custom Unauthorized Message',
        },
      ],
    });
    expect(response.status).toEqual(401);

    // Done
    done();
  });
  it('should support additional JSON:API attributes automatically', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw badRequest('My Custom Error Message', { id: 'my-error-id', code: 'my-error-code', meta: { isMeta: true } });
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-error-id',
          code: 'my-error-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My Custom Error Message',
          meta: { isMeta: true },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should support boomified generic errors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const err: { data?: object } & Error = new Error('My boomified error');
      err.data = { id: 'my-boomified-error-id', code: 'my-boomified-error-code', meta: { isMeta: false } };
      throw boomify(err, { statusCode: 400 });
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-boomified-error-id',
          code: 'my-boomified-error-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My boomified error',
          meta: { isMeta: false },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should support boomified VErrors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const sourceError = new VError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'Root Error');
      const err = new VError(
        {
          cause: sourceError,
          info: { id: 'my-boomified-verror-id', code: 'my-boomified-verror-code', meta: { isMeta: false } },
        },
        'My boomified verror',
      );
      throw boomify(err, { statusCode: 400 });
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-boomified-verror-id',
          code: 'my-boomified-verror-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My boomified verror: Root Error',
          meta: { isMeta: false },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should support boomified WErrors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const sourceError = new VError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'Root Error');
      const err = new WError(
        {
          cause: sourceError,
          info: { id: 'my-boomified-werror-id', code: 'my-boomified-werror-code', meta: { isMeta: false } },
        },
        'My boomified werror',
      );
      throw boomify(err, { statusCode: 400 });
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-boomified-werror-id',
          code: 'my-boomified-werror-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My boomified werror',
          meta: { isMeta: false },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should support boomified MultiErrors', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const sourceError1 = new VError({ info: { code: 'my-root-error-1', meta: { something: 456 } } }, 'Root Error');
      const error1 = new WError(
        {
          cause: sourceError1,
          info: { id: 'my-boomified-werror-id', code: 'my-boomified-werror-code', meta: { isMeta: false } },
        },
        'My boomified werror',
      );
      const sourceError2 = new VError({ info: { code: 'my-root-error-2', meta: { else: 789 } } }, 'Root Error');
      const error2 = new VError(
        {
          cause: sourceError2,
          info: { id: 'my-boomified-verror-id', code: 'my-boomified-verror-code', meta: { isMeta: true } },
        },
        'My boomified verror',
      );
      const err = new MultiError([boomify(error1, { statusCode: 400 }), boomify(error2, { statusCode: 400 })]);
      throw boomify(err, { statusCode: 400 });
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-boomified-werror-id',
          code: 'my-boomified-werror-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My boomified werror',
          meta: { isMeta: false },
        },
        {
          id: 'my-boomified-verror-id',
          code: 'my-boomified-verror-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My boomified verror: Root Error',
          meta: { isMeta: true },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
});
describe('VError', () => {
  it('should send 500 and a default error message', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new VError('My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
        },
      ],
    });
    expect(response.status).toEqual(500);

    // Done
    done();
  });
  it('should respect statusCode property in info object', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new VError({ info: { statusCode: 400 } }, 'My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '400',
          title: 'Bad Request',
          detail: 'My Custom Error Message',
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  it('should respect status property in info object', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new VError({ info: { status: 400 } }, 'My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '400',
          title: 'Bad Request',
          detail: 'My Custom Error Message',
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
  describe('nested VErrors', () => {
    it('should support nested VErrors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const sourceError = new VError('Root Error');
        throw new VError({ cause: sourceError, info: { statusCode: 400 } }, 'My Nested VError');
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            status: '400',
            title: 'Bad Request',
            detail: 'My Nested VError: Root Error',
          },
        ],
      });
      expect(response.status).toEqual(400);

      // Done
      done();
    });
    it('should inherit info from cause and override where present in parent', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const sourceError = new VError(
          { info: { id: 'root-id', code: 'root-code', meta: { something: true } } },
          'Root Error',
        );
        throw new VError({ cause: sourceError, info: { statusCode: 400, id: 'my-id' } }, 'My Nested VError');
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: 'my-id',
            code: 'root-code',
            status: '400',
            title: 'Bad Request',
            detail: 'My Nested VError: Root Error',
            meta: {
              something: true,
            },
          },
        ],
      });
      expect(response.status).toEqual(400);

      // Done
      done();
    });
  });
});
describe('WError', () => {
  it('should hide nested error message', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const sourceError = new VError(
        { info: { id: 'root-id', code: 'root-code', meta: { something: true } } },
        'Root Error',
      );
      throw new WError({ cause: sourceError, info: { statusCode: 400, id: 'my-id' } }, 'My Nested WError');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-id',
          code: 'root-code',
          status: '400',
          title: 'Bad Request',
          detail: 'My Nested WError',
          meta: {
            something: true,
          },
        },
      ],
    });
    expect(response.status).toEqual(400);

    // Done
    done();
  });
});
describe('MultiError', () => {
  it('should send 500 and a default error message', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const sourceError1 = new VError({ info: { id: 'my-id-1' } }, 'Root Error');
      const error1 = new WError(
        { cause: sourceError1, info: { code: 'my-code', meta: { isMeta: false } } },
        'My WError',
      );
      const sourceError2 = new VError(
        { info: { id: 'my-id-2', code: 'my-nested-code', meta: { else: 789 } } },
        'Root Error',
      );
      const error2 = new VError(
        { cause: sourceError2, info: { id: 'my-id', code: 'my-code', meta: { isMeta: true } } },
        'My VError',
      );
      throw new MultiError([error1, error2]);
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          id: 'my-id-1',
          code: 'my-code',
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
          meta: { isMeta: false },
        },
        {
          id: 'my-id',
          code: 'my-code',
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
          meta: { isMeta: true },
        },
      ],
    });
    expect(response.status).toEqual(500);

    // Done
    done();
  });
});
describe('content types', () => {
  it('should default to json', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new Error('My Custom Error Message');
    });

    const response = await request(app.callback()).get('/');

    // Assertions
    expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.body).toEqual({
      errors: [
        {
          status: '500',
          title: 'Internal Server Error',
          detail: 'An internal server error occurred',
        },
      ],
    });
    expect(response.status).toEqual(500);

    // Done
    done();
  });
  it('should support text', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new Error('My Custom Error Message');
    });

    const response = await request(app.callback())
      .get('/')
      .accept('text/plain');

    // Assertions
    expect(response.header['content-type']).toEqual('text/plain; charset=utf-8');
    expect(response.text).toEqual(
      JSON.stringify(
        {
          errors: [
            {
              status: '500',
              title: 'Internal Server Error',
              detail: 'An internal server error occurred',
            },
          ],
        },
        null,
        2,
      ),
    );
    expect(response.status).toEqual(500);

    // Done
    done();
  });
  it('should support html', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new Error('My Custom Error Message');
    });

    const response = await request(app.callback())
      .get('/')
      .accept('text/html');

    // Assertions
    expect(response.header['content-type']).toEqual('text/html; charset=utf-8');
    expect(response.text).toEqual(
      `<!doctype html><html lang=en><head><meta charset=utf-8><title>Internal Server Error</title></head><body><h1>An internal server error occurred</h1><pre>${JSON.stringify(
        {
          errors: [
            {
              status: '500',
              title: 'Internal Server Error',
              detail: 'An internal server error occurred',
            },
          ],
        },
        null,
        2,
      )}</pre></body></html>`,
    );
    expect(response.status).toEqual(500);

    // Done
    done();
  });
});
