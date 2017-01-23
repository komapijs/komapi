// Dependencies
import test from 'ava';
import sleep from 'sleep-promise';
import Komapi from '../../../src/index';
import ormFactory from '../../fixtures/ormFactory';

// Tests
test('is not enabled by default', async (t) => {
  const app = new Komapi();
  await ormFactory(app);
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  t.is(collection.length, 1);
  t.is(collection[0].name, 'nametest');
  t.is(collection[0].id, 1);
  t.is(collection[0].createdAt, null);
  t.is(collection[0].created_at, null);
  t.is(collection[0].updatedAt, null);
  t.is(collection[0].updated_at, null);
  t.is(collection[0].created_at, collection[0].updated_at);
  t.is(collection[0].createdAt, collection[0].updatedAt);
  t.is(app.orm.Test.systemColumns.indexOf('created_at'), -1);
  t.is(app.orm.Test.systemColumns.indexOf('updated_at'), -1);
  t.is(app.orm.Test.systemColumns.indexOf('createdAt'), -1);
  t.is(app.orm.Test.systemColumns.indexOf('updatedAt'), -1);
});
test('is not enabled by default and does not impact schema validation', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    schema: 1,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  t.is(collection.length, 1);
  t.is(collection[0].name, 'nametest');
  t.is(collection[0].id, 1);
  t.is(collection[0].createdAt, null);
  t.is(collection[0].created_at, null);
  t.is(collection[0].updatedAt, null);
  t.is(collection[0].updated_at, null);
  t.is(collection[0].created_at, collection[0].updated_at);
  t.is(collection[0].createdAt, collection[0].updatedAt);
});
test('is enabled by setting timestamps property', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    timestamps: true,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  t.is(collection.length, 1);
  t.is(collection[0].name, 'nametest');
  t.is(collection[0].id, 1);
  t.is(collection[0].createdAt, null);
  t.is(typeof collection[0].created_at, 'string');
  t.is(collection[0].updatedAt, null);
  t.is(typeof collection[0].updated_at, 'string');
  t.is(collection[0].created_at, collection[0].updated_at);
  t.is(collection[0].createdAt, collection[0].updatedAt);
  t.not(app.orm.Test.systemColumns.indexOf('created_at'), -1);
  t.not(app.orm.Test.systemColumns.indexOf('updated_at'), -1);
});
test('sets updated_at on updates', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    timestamps: true,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  let person = collection[0];
  const ct = person.created_at;
  t.is(person.createdAt, null);
  t.is(person.updated_at, ct);
  await sleep(10);
  await person.$query().columns('*').patch({ name: 'testupdated' }).then();
  person = await person.$query().columns('*').then();
  t.is(person.name, 'testupdated');
  t.is(person.created_at, ct);
  t.not(person.updated_at, ct);
  t.is(typeof person.updated_at, 'string');
  t.is(person.updatedAt, null);
});
test('sets updated_at on updates with camelCase', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    timestamps: true,
    camelCase: true,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  let person = collection[0];
  const ct = person.createdAt;
  t.is(person.created_at, null);
  t.is(person.updatedAt, ct);
  await sleep(10);
  await person.$query().columns('*').patch({ name: 'testupdated' }).then();
  person = await person.$query().columns('*').then();
  t.is(person.name, 'testupdated');
  t.is(person.createdAt, ct);
  t.not(person.updatedAt, ct);
  t.is(typeof person.updatedAt, 'string');
  t.is(person.updated_at, null);
  t.not(app.orm.Test.systemColumns.indexOf('createdAt'), -1);
  t.not(app.orm.Test.systemColumns.indexOf('updatedAt'), -1);
});
test('sets updated_at on updates with jsonSchema', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    timestamps: true,
    schema: 1,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  let person = collection[0];
  const ct = person.created_at;
  t.is(person.createdAt, null);
  t.is(person.updated_at, ct);
  await sleep(10);
  await person.$query().columns('*').patch({ name: 'testupdated' }).then();
  person = await person.$query().columns('*').then();
  t.is(person.name, 'testupdated');
  t.is(person.created_at, ct);
  t.not(person.updated_at, ct);
  t.is(typeof person.updated_at, 'string');
  t.is(person.updatedAt, null);
});
test('sets updated_at on updates with jsonSchema and camelCase', async (t) => {
  const app = new Komapi();
  await ormFactory(app, {
    timestamps: true,
    schema: 1,
    camelCase: true,
  });
  const model = {
    name: 'nametest',
  };
  await app.orm.Test.query().columns('*').insert(model).then();
  const collection = await app.orm.Test.query().columns('*').then();
  let person = collection[0];
  const ct = person.createdAt;
  t.is(person.created_at, null);
  t.is(person.updatedAt, ct);
  await sleep(10);
  await person.$query().columns('*').patch({ name: 'testupdated' }).then();
  person = await person.$query().columns('*').then();
  t.is(person.name, 'testupdated');
  t.is(person.createdAt, ct);
  t.not(person.updatedAt, ct);
  t.is(typeof person.updatedAt, 'string');
  t.is(person.updated_at, null);
});
