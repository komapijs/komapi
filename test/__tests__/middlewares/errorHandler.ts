import request from 'supertest';
import Koa from 'koa';
import { BadRequest, createHttpError, InternalServerError, VError, Unauthorized } from 'botched';
import errorHandler from '../../../src/middlewares/errorHandler';

// Tests
describe('options', () => {
  it('should show all (non-sensitive) error details by default', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      throw new BadRequest(
        { id: 'my-error-id', code: 'my-error-code', meta: { isMeta: true } },
        'My Custom Error Message',
      );
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
  it('should have option hide details with `options.showDetails = false`', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler({ showDetails: false }));
    app.use(() => {
      throw new BadRequest(
        { id: 'my-error-id', code: 'my-error-code', meta: { isMeta: true } },
        'My Custom Error Message',
      );
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
        },
      ],
    });
    expect(response.status).toEqual(400);

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
          id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          status: '500',
          code: 'InternalServerError',
          title: 'Internal Server Error',
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
    expect(JSON.parse(response.text)).toEqual({
      errors: [
        {
          id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
          status: '500',
          title: 'Internal Server Error',
          code: 'InternalServerError',
        },
      ],
    });
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
      throw new InternalServerError({ id: 'custom-id' }, 'My Custom Error Message');
    });

    const response = await request(app.callback())
      .get('/')
      .accept('text/html');

    // Assertions
    expect(response.header['content-type']).toEqual('text/html; charset=utf-8');
    expect(response.text).toEqual(
      `<!doctype html><html lang=en><head><meta charset=utf-8><title>Internal Server Error</title></head><body><h1>My Custom Error Message</h1><pre>${JSON.stringify(
        {
          errors: [
            {
              id: 'custom-id',
              code: 'InternalServerError',
              status: '500',
              title: 'Internal Server Error',
              detail: 'My Custom Error Message',
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
describe('error types', () => {
  describe('generic errors', () => {
    it('should send 500 and a default error message for implicit internal server errors', async done => {
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
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            status: '500',
            code: 'InternalServerError',
            title: 'Internal Server Error',
          },
        ],
      });
      expect(response.status).toEqual(500);

      // Done
      done();
    });
  });
  describe('Botched errors', () => {
    it('should send 500 and the specific error message for explicit internal server errors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        throw new InternalServerError('My Custom Error Message');
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            status: '500',
            code: 'InternalServerError',
            title: 'Internal Server Error',
            detail: 'My Custom Error Message',
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
        throw new BadRequest('My Custom Error Message');
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
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
    it('should send 401 and the provided error message and the headers', async done => {
      expect.assertions(4);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        throw new Unauthorized(
          { headers: { 'www-authenticate': 'my-scheme error="My Custom Unauthorized Message"' } },
          'My Custom Unauthorized Message',
        );
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.header['www-authenticate']).toEqual('my-scheme error="My Custom Unauthorized Message"');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'Unauthorized',
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
        throw new BadRequest(
          { id: 'my-error-id', code: 'my-error-code', meta: { isMeta: true } },
          'My Custom Error Message',
        );
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
    it('should support botched generic http errors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const err: { data?: object } & Error = new Error('My botched error');
        err.data = { id: 'my-botched-error-id', code: 'my-botched-error-code', meta: { isMeta: false } };
        throw createHttpError(400, { cause: err });
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
            status: '400',
            title: 'Bad Request',
          },
        ],
      });
      expect(response.status).toEqual(400);

      // Done
      done();
    });
    it('should support botched VErrors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const sourceError = new VError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'Root Error');
        const err = new VError(
          {
            cause: sourceError,
            info: { id: 'my-botched-verror-id', code: 'my-botched-verror-code', meta: { isMeta: false } },
          },
          'My botched verror',
        );
        throw createHttpError(400, { cause: err });
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
            status: '400',
            title: 'Bad Request',
          },
        ],
      });
      expect(response.status).toEqual(400);

      // Done
      done();
    });
    it('should support botched WErrors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const sourceError = new VError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'Root Error');
        const err = new VError.WError(
          {
            cause: sourceError,
            info: { id: 'my-botched-werror-id', code: 'my-botched-werror-code', meta: { isMeta: false } },
          },
          'My botched werror',
        );
        throw createHttpError(400, { cause: err });
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
            status: '400',
            title: 'Bad Request',
          },
        ],
      });
      expect(response.status).toEqual(400);

      // Done
      done();
    });
    it('should support botched MultiErrors', async done => {
      expect.assertions(3);
      const app = new Koa();

      // Add middlewares
      app.use(errorHandler());
      app.use(() => {
        const sourceError1 = new VError({ info: { code: 'my-root-error-1', meta: { something: 456 } } }, 'Root Error');
        const error1 = new VError.WError(
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
        const err = new VError.MultiError([
          createHttpError(400, { cause: error1 }),
          createHttpError(400, { cause: error2 }),
        ]);
        throw createHttpError(400, { cause: err });
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
            status: '400',
            title: 'Bad Request',
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
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'InternalServerError',
            status: '500',
            title: 'Internal Server Error',
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
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
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
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'BadRequest',
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
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'BadRequest',
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
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'BadRequest',
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
        const error1 = new VError.WError(
          { cause: sourceError1, info: { code: 'my-code', meta: { isMeta: false } } },
          'My WError',
        );
        const sourceError2 = new VError(
          { info: { id: 'my-id-2', code: 'my-nested-code', meta: { else: 789 } } },
          'Root Error',
        );
        const error2 = new InternalServerError(
          { cause: sourceError2, id: 'my-id', code: 'my-code', meta: { isMeta: true } },
          'My Internal Server Error',
        );
        throw new VError.MultiError([error1, error2]);
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
      expect(response.body).toEqual({
        errors: [
          {
            id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
            code: 'InternalServerError',
            status: '500',
            title: 'Internal Server Error',
          },
          {
            id: 'my-id',
            code: 'my-code',
            status: '500',
            title: 'Internal Server Error',
            detail: 'My Internal Server Error',
            meta: { isMeta: true },
          },
        ],
      });
      expect(response.status).toEqual(500);

      // Done
      done();
    });
  });
});
