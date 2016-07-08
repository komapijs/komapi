'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Init
process.setMaxListeners(11); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('is not enabled by default', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app);
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
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
test('is not enabled by default and does not impact schema validation', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        schema: 1
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
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
test('is enabled by setting timestamps property', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    t.is(collection.length, 1);
    t.is(collection[0].name, 'nametest');
    t.is(collection[0].id, 1);
    t.is(collection[0].createdAt, null);
    t.is(typeof collection[0].created_at, 'string');
    t.is(collection[0].updatedAt, null);
    t.is(typeof collection[0].updated_at, 'string');
    t.is(collection[0].created_at, collection[0].updated_at);
    t.is(collection[0].createdAt, collection[0].updatedAt);
});
test('sets updated_at on updates', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with camelCase', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
});
test('sets updated_at on updates with jsonSchema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: 1
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with jsonSchema and camelCase', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: 1,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
});