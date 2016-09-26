'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../../src/index';
import * as ormFactory from '../../fixtures/ormFactory';
import sleep from 'sleep-promise';

// Tests
test('is not enabled by default', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app);
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
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
test('is not enabled by default and does not impact schema validation', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        schema: 1
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
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
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
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
test('sets updated_at on updates', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await sleep(10);
    await person.$query().columns('*').patch({name: 'testupdated'}).then();
    person = await person.$query().columns('*').then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with camelCase', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await sleep(10);
    await person.$query().columns('*').patch({name: 'testupdated'}).then();
    person = await person.$query().columns('*').then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
    t.not(app.orm.Test.systemColumns.indexOf('createdAt'), -1);
    t.not(app.orm.Test.systemColumns.indexOf('updatedAt'), -1);
});
test('sets updated_at on updates with jsonSchema', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: 1
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await sleep(10);
    await person.$query().columns('*').patch({name: 'testupdated'}).then();
    person = await person.$query().columns('*').then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with jsonSchema and camelCase', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: 1,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().columns('*').insert(model).then();
    let collection = await app.orm.Test.query().columns('*').then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await sleep(10);
    await person.$query().columns('*').patch({name: 'testupdated'}).then();
    person = await person.$query().columns('*').then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
});