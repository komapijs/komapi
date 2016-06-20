'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Tests
test('is enabled by default and triggers "post-creating" event during save', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm);
    ormFactory.models(app.orm);
    let test = new app.orm.models.Test({
        name: ''
    });
    test.on('post-creating', () => {
        t.pass();
    });
    await test.save();
});
test('is enabled by default and triggers "post-saving" event during save', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm);
    ormFactory.models(app.orm);
    let test = new app.orm.models.Test({
        name: ''
    });
    test.on('post-saving', () => {
        t.pass();
    });
    await test.save();
});
test('is enabled by default and triggers "post-updating" event during update', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm);
    ormFactory.models(app.orm);
    let test = new app.orm.models.Test({
        name: ''
    });
    test.on('post-updating', () => {
        t.pass();
    });
    await test.save();
    test.set({
        name: 'new'
    });
    await test.save();
});
test('is enabled by default and triggers "post-saving" event during update', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm);
    ormFactory.models(app.orm);
    let test = new app.orm.models.Test({
        name: ''
    });
    await test.save();
    test.on('post-saving', () => {
        t.pass();
    });
    test.set({
        name: 'new'
    });
    await test.save();
});