// Dependencies
import test from 'ava';
import { agent as request } from 'supertest';
import path from 'path';
import Router from 'koa-router';
import Komapi from '../../../src/index';

// Tests
test('can register routes automatically using a provided router', async (t) => {
  const app = new Komapi();
  app.services(path.join(__dirname, '../../fixtures/services/user.js'));
  app.route(app.service.User.$getRoutes(new Router()).routes());
  const res1 = await request(app.listen()).get('/1');
  const res2 = await request(app.listen()).get('/');
  t.is(res1.text, '1');
  t.is(res2.status, 404);
});
test('provides its own router if not provided', async (t) => {
  const app = new Komapi();
  app.services(path.join(__dirname, '../../fixtures/services/user.js'));
  app.use(app.service.User.$getRoutes().routes());
  const res1 = await request(app.listen()).get('/1');
  const res2 = await request(app.listen()).get('/');
  t.is(res1.text, '1');
  t.is(res2.status, 404);
});
