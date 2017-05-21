// Dependencies
import test from 'ava';
import path from 'path';
import Komapi from '../../src/index';

// Init
const connection = {
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: ':memory:',
  },
};

// Tests
test('loads models through the models() method', async (t) => {
  const app = new Komapi();
  app.knex(connection);
  app.models(path.join(__dirname, '../fixtures/models'));
  t.is(Object.keys(app.orm).filter(k => !k.startsWith('$')).length, 3);
});
test('can load a single model', async (t) => {
  const app = new Komapi();
  app.knex(connection);
  app.models(path.join(__dirname, '../fixtures/models/user.js'));
  t.is(Object.keys(app.orm).filter(k => !k.startsWith('$')).length, 1);
});
test('does not allow loading models without an objection instance', async (t) => {
  const app = new Komapi();
  t.throws(() => {
    app.models(path.join(__dirname, '../fixtures/models'));
  }, 'Use `app.knex()` before attempting to load models!');
});
