import request from 'supertest';
import { InternalServerError } from 'botched';
import Komapi from '../../../fixtures/Komapi';
import errorHandler from '../../../../src/middlewares/errorHandler';

// Tests
describe('app.createContext()', () => {
  describe('ctx.request.requestId', () => {
    it('should be available on `ctx.requestId`', () => {
      expect.assertions(2);
      const app = new Komapi();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.request.requestId).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
        expect(ctx.requestId).toBe(ctx.request.requestId);

        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
    it('should be unique', async done => {
      expect.assertions(5);
      const app = new Komapi();

      // Add middlewares
      app.use(ctx => ctx.send(ctx.request.requestId));

      const server = request(app.callback());
      const responses = await Promise.all([server.get('/'), server.get('/')]);

      // Assertions
      expect(responses[0].status).toBe(200);
      expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(responses[1].status).toBe(200);
      expect(responses[1].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(responses[0].text).not.toEqual(responses[1].text);

      // Done
      done();
    });
    it('should not use the x-request-id header if app.proxy != true (default)', async done => {
      expect.assertions(6);
      const app = new Komapi();

      // Add middlewares
      app.use(ctx => ctx.send(ctx.request.requestId));

      const server = request(app.callback());
      const responses = await Promise.all([
        server.get('/').set('x-request-id', 'req1'),
        server.get('/').set('x-request-id', 'req2'),
      ]);

      // Assertions
      expect(responses[0].status).toBe(200);
      expect(responses[0].text).not.toBe('req1');
      expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(responses[1].status).toBe(200);
      expect(responses[1].text).not.toBe('req2');
      expect(responses[0].text).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

      // Done
      done();
    });
    it('should use the x-request-id header if app.proxy = true', async done => {
      expect.assertions(4);
      const app = new Komapi({ config: { proxy: true } });

      // Add middlewares
      app.use(ctx => ctx.send(ctx.request.requestId));

      const server = request(app.callback());
      const responses = await Promise.all([
        server.get('/').set('x-request-id', 'req1'),
        server.get('/').set('x-request-id', 'req2'),
      ]);

      // Assertions
      expect(responses[0].status).toBe(200);
      expect(responses[0].text).toBe('req1');
      expect(responses[1].status).toBe(200);
      expect(responses[1].text).toBe('req2');

      // Done
      done();
    });
  });
  describe('ctx.log', () => {
    it('should be a shortcut for `app.log`', () => {
      expect.assertions(1);
      const app = new Komapi();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.log).toBe(app.log);
        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
  });
  describe('ctx.request.startAt', () => {
    it('should be available on `ctx.startAt`', () => {
      expect.assertions(2);
      const app = new Komapi();
      const startAt = Date.now();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.request.startAt).toBeGreaterThanOrEqual(startAt);
        expect(ctx.startAt).toBe(ctx.request.startAt);

        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
  });
  describe('ctx.response.send', () => {
    it('should be available on `ctx.send`', () => {
      expect.assertions(1);
      const app = new Komapi();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.send).toBe(ctx.response.send);
        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
    it('should be a setter for `ctx.response.body`', async done => {
      expect.assertions(3);
      const app = new Komapi();

      // Create proxy listener
      app.response = new Proxy(app.response, {
        set(obj, prop, value) {
          if (prop === 'body') {
            expect(value).toBe('My Custom Body');
          }
          return Reflect.set(obj, prop, value);
        },
      });

      // Add middlewares
      app.use(ctx => ctx.send('My Custom Body'));

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.text).toBe('My Custom Body');

      // Done
      done();
    });
  });
  describe('ctx.response.sendError', () => {
    it('should be available on `ctx.sendError`', () => {
      expect.assertions(1);
      const app = new Komapi();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.sendError).toBe(ctx.response.sendError);
        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
    it('should be a throw function for `botched.createError`', async done => {
      expect.assertions(3);
      const app = new Komapi();

      // Add middlewares
      app.use(ctx => {
        expect(() => ctx.sendError(500)).toThrowError(InternalServerError);
        ctx.sendError(500);
      });

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.status).toBe(500);
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

      // Done
      done();
    });
  });
  describe('ctx.response.sendSchema', () => {
    it('should be available on `ctx.sendSchema`', () => {
      expect.assertions(1);
      const app = new Komapi();

      // Add middlewares
      app.use((ctx, next) => {
        // Assertions
        expect(ctx.sendSchema).toBe(ctx.response.sendSchema);
        return next();
      });

      // Done
      return request(app.callback()).get('/');
    });
    it('should be a setter for `ctx.response.body` after validating json schema', async done => {
      expect.assertions(3);
      const app = new Komapi();
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: false,
        required: ['included', 'someString'],
        type: 'object',
        properties: {
          included: { type: 'boolean' },
          someString: { type: 'string' },
        },
      };

      // Create proxy listener
      app.response = new Proxy(app.response, {
        set(obj, prop, value) {
          if (prop === 'body') {
            expect(value).toEqual({ included: true, someString: 'hello world!' });
          }
          return Reflect.set(obj, prop, value);
        },
      });

      // Add middlewares
      app.use(ctx => ctx.sendSchema(schema, { excluded: true, included: true, someString: 'hello world!' }));

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ included: true, someString: 'hello world!' });

      // Done
      done();
    });
    it('should create internal server errors if schema validation fails', async done => {
      expect.assertions(1);
      const app = new Komapi();
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: false,
        required: ['included', 'someString'],
        type: 'object',
        properties: {
          included: { type: 'boolean' },
          someString: { type: 'string' },
        },
      };

      // Add middlewares
      app.use(ctx => {
        expect(() => ctx.sendSchema(schema, { included: 'should be boolean' })).toThrow(InternalServerError);
      });

      await request(app.callback()).get('/');

      // Done
      done();
    });
    it('should not leak details when throwing', async done => {
      expect.assertions(2);
      const app = new Komapi();
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: false,
        required: ['included', 'someString'],
        type: 'object',
        properties: {
          included: { type: 'boolean' },
          someString: { type: 'string' },
        },
      };

      // Add middlewares
      app.use(errorHandler());
      app.use(ctx => ctx.sendSchema(schema, { included: 'should be boolean' }));

      const response = await request(app.callback()).get('/');

      // Assertions
      expect(response.status).toBe(500);
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

      // Done
      done();
    });
  });
});
