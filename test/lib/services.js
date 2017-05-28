// Dependencies
import test from 'ava';
import Komapi from '../../src/index';
import User from '../fixtures/services/user';
import Comment from '../fixtures/services/comment';

// Tests
test('loads services through the services() method', async (t) => {
  const app = new Komapi();
  app.services({ User, Comment });
  t.is(Object.keys(app.service).length, 2);
  t.true(app.service.User instanceof User);
  t.true(app.service.Comment instanceof Comment);
});
test('adds hooks automatically', async (t) => {
  const app = new Komapi();
  app.services({ User });
  const id = 10;
  const res1 = await app.service.User.getWithHooks(id);
  const res2 = await app.service.User.get(id);
  t.is(res1, id + 2);
  t.is(res2, id);
});
