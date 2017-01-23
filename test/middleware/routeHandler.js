// Dependencies
import test from 'ava';
import { agent as request } from 'supertest-as-promised';
import path from 'path';
import Komapi from '../../src/index';

// Tests
test('is enabled through app.mw.route() method using es6 routes', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route(path.join(__dirname, '../fixtures/routes')));
  const res = await request(app.listen())
    .get('/');
  t.is(res.status, 200);
  t.deepEqual(res.body, {
    status: 'index',
  });
});
test('supports es5 routes', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route(path.join(__dirname, '../fixtures/routes')));
  const res = await request(app.listen())
    .get('/es5');
  t.is(res.status, 200);
  t.deepEqual(res.body, {
    status: 'es5',
  });
});
test('supports specifying specific route files', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route(path.join(__dirname, '../fixtures/routes/es5.js')));
  const res = await request(app.listen())
    .get('/');
  t.is(res.status, 200);
  t.deepEqual(res.body, {
    status: 'es5',
  });
});
test('supports using route modules directly', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route((router) => {
    router.get('/ty', ctx => ctx.send({ ty: 'works' }));
    return router;
  }));
  const res = await request(app.listen())
    .get('/ty');
  t.is(res.status, 200);
  t.deepEqual(res.body, {
    ty: 'works',
  });
});
test('supports loading multiple middlewares at once', async (t) => {
  const app = new Komapi();
  t.plan(6);
  app.use(app.mw.route(...[
    (ctx, next) => {
      t.pass();
      return next();
    },
    (ctx, next) => {
      t.pass();
      return next();
    },
    (ctx, next) => {
      t.pass();
      return next();
    },
    (ctx, next) => {
      t.pass();
      return next();
    },
    (ctx, next) => {
      t.pass();
      return next();
    },
  ], path.join(__dirname, '../fixtures/routes')));
  const res = await request(app.listen())
    .get('/es5');
  t.deepEqual(res.body, {
    status: 'es5',
  });
});
test('supports being mounted', async (t) => {
  const app = new Komapi();
  t.plan(3);
  app.use('/test', app.mw.route(path.join(__dirname, '../fixtures/routes')));
  const res1 = await request(app.listen())
    .get('/es5');
  const res2 = await request(app.listen())
    .get('/test/es5');
  t.is(res1.status, 404);
  t.is(res2.status, 200);
  t.deepEqual(res2.body, {
    status: 'es5',
  });
});
test('responds with 405 for unallowed methods', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route(path.join(__dirname, '../fixtures/routes')));
  const res = await request(app.listen())
    .post('/');
  t.is(res.status, 405);
});
test('responds with 501 for SEARCH', async (t) => {
  const app = new Komapi();
  app.use(app.mw.route(path.join(__dirname, '../fixtures/routes')));
  const res = await request(app.listen())
    .search('/');
  t.is(res.status, 501);
});
