// Dependencies
import test from 'ava';
import { agent as request } from 'supertest';
import Komapi from '../../src/index';

// Tests
test('is enabled through app.mw.notFound()', async (t) => {
  const app = new Komapi();
  app.use(app.mw.notFound());
  const res = await request(app.listen()).get('/');
  t.is(res.status, 404);
  t.deepEqual(res.body, {
    error: {
      code: '',
      status: 404,
      message: 'Not Found',
    },
  });
});
test('gracefully supports text/plain', async (t) => {
  const app = new Komapi();
  app.use(app.mw.notFound());
  const res = await request(app.listen()).get('/').set('Accept', 'text/plain');
  t.is(res.status, 404);
  t.is(res.text, JSON.stringify({
    error: {
      code: '',
      status: 404,
      message: 'Not Found',
    },
  }, null, 2));
});
test('does not interfere if route was found', async (t) => {
  const app = new Komapi();
  app.use(app.mw.notFound());
  app.use(ctx => ctx.send({ status: 'ok' }));
  const res = await request(app.listen()).get('/');
  t.is(res.status, 200);
  t.deepEqual(res.body, { status: 'ok' });
});
