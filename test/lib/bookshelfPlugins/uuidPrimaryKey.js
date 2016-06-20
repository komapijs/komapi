'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Tests
test('is not enabled by default', async t => {
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
    t.is(test.id, 1);
});
test('is enabled by setting "uuidPrimaryKey" to true on the model', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        uuidPrimaryKey: true
    });
    ormFactory.models(app.orm, {
        uuidPrimaryKey: true
    });
    let test = new app.orm.models.Test({
        name: ''
    });
    await test.save();
    t.regex(test.id, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});