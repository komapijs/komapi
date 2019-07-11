import request from 'supertest';
import Koa from 'koa';
import { BadRequest, InternalServerError, VError, Unauthorized, ImATeapot } from 'botched';
import errorHandler from '../../../src/middlewares/errorHandler';

// Tests
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
    describe('BotchedError', () => {
      it('should send 500 and the provided error message for explicit internal server errors', async done => {
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
      it('should support additional JSON:API attributes by default', async done => {
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
    });
    describe('VError', () => {
      it('should send 500 and a default error message for VErrors', async done => {
        expect.assertions(3);
        const app = new Koa();

        // Add middlewares
        app.use(errorHandler());
        app.use(() => {
          throw new VError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'VError Error');
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
    });
    describe('WError', () => {
      it('should send 500 and a default error message for WError', async done => {
        expect.assertions(3);
        const app = new Koa();

        // Add middlewares
        app.use(errorHandler());
        app.use(() => {
          throw new VError.WError({ info: { code: 'my-root-error', meta: { something: 123 } } }, 'VError Error');
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
    });
    describe('MultiError', () => {
      it('should send 500 for any 500 errors and include details for all errors contained in the MultiError', async done => {
        expect.assertions(4);
        const app = new Koa();

        // Add middlewares
        app.use(errorHandler());
        app.use(() => {
          const err1 = new Error('My First Error');
          const err2 = new BadRequest('My Second Error');
          const err3 = new Unauthorized({ meta: { something: true } }, 'My Third Error');
          throw new VError.MultiError([err1, err2, err3]);
        });

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
        expect(response.header['www-authenticate']).not.toBeDefined();
        expect(response.body).toEqual({
          errors: [
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'InternalServerError',
              status: '500',
              title: 'Internal Server Error',
            },
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'BadRequest',
              status: '400',
              title: 'Bad Request',
              detail: 'My Second Error',
            },
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'Unauthorized',
              status: '401',
              title: 'Unauthorized',
              detail: 'My Third Error',
              meta: { something: true },
            },
          ],
        });
        expect(response.status).toEqual(500);

        // Done
        done();
      });
      it('should send 400 for 400-499 errors and include details for all errors contained in the MultiError', async done => {
        expect.assertions(3);
        const app = new Koa();

        // Add middlewares
        app.use(errorHandler());
        app.use(() => {
          const err1 = new ImATeapot('My First Error');
          const err2 = new BadRequest('My Second Error');
          const err3 = new Unauthorized({ meta: { something: true } }, 'My Third Error');
          throw new VError.MultiError([err1, err2, err3]);
        });

        const response = await request(app.callback()).get('/');

        // Assertions
        expect(response.header['content-type']).toEqual('application/json; charset=utf-8');
        expect(response.body).toEqual({
          errors: [
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'ImATeapot',
              status: '418',
              title: "I'm a Teapot",
              detail: 'My First Error',
            },
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'BadRequest',
              status: '400',
              title: 'Bad Request',
              detail: 'My Second Error',
            },
            {
              id: expect.stringMatching(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i),
              code: 'Unauthorized',
              status: '401',
              title: 'Unauthorized',
              detail: 'My Third Error',
              meta: { something: true },
            },
          ],
        });
        expect(response.status).toEqual(400);

        // Done
        done();
      });
    });
  });
});
describe('options', () => {
  it('should show all (non-sensitive) error details by default from a botched error', async done => {
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
  it('should hide all (non-sensitive) error details by default from a non-botched error', async done => {
    expect.assertions(3);
    const app = new Koa();

    // Add middlewares
    app.use(errorHandler());
    app.use(() => {
      const err: { data?: any } & Error = new Error('My Custom Error Message');
      err.data = { id: 'my-error-id', code: 'my-error-code', meta: { isMeta: true } };
      throw err;
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
  it('shouldhide details with `options.showDetails = false`', async done => {
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
  describe('html', () => {
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
    it('should default to show title if error does not have details', async done => {
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
      expect(response.text).toMatch('<h1>Internal Server Error</h1>');
      expect(response.status).toEqual(500);

      // Done
      done();
    });
  });
});
