'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Init
process.setMaxListeners(11); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('does not throw without a defined schema', async t => {
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
    await new app.orm.models.Test({
        name: ''
    }).save();
    t.pass();
});
test('throws with a defined schema and invalid attributes', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    await t.throws(new app.orm.models.Test({
        name: ''
    }).save());
});
test('throws with a defined schema where existing attributes are invalid', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    let test = new app.orm.models.Test({
        name: 'test',
        num: 2
    });
    await test.save(null, {
        disableValidation: true
    });
    test.set({
        name: 'test2'
    });
    await t.throws(test.save());
});
test('throws with a defined schema of type 1 and changed attributes are invalid with "patch" option set', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    let test = new app.orm.models.Test({
        name: 'test',
        num: 2
    });
    await test.save(null, {
        disableValidation: true
    });
    await t.throws(test.save({
        num: 1
    }, {
        patch: true
    }));
});
test('throws with a defined schema of type 2 and changed attributes are invalid with "patch" option set', async t => {
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
    ormFactory.models(app.orm, {
        schema: 2
    });
    let test = new app.orm.models.Test({
        name: 'test',
        num: 2
    });
    await test.save(null, {
        disableValidation: true
    });
    await t.throws(test.save({
        num: 1
    }, {
        patch: true
    }));
});
test('allows valid input with a defined schema', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    await new app.orm.models.Test({
        name: 'valid name'
    }).save();
    t.pass();
});
test('allows valid input with a defined schema where existing attributes are invalid if set "patch" option is set', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    let test = new app.orm.models.Test({
        name: 'test',
        num: 2
    });
    await test.save(null, {
        disableValidation: true
    });
    await test.save({
        name: 'test2'
    }, {
        patch: true
    });
    t.pass();
});
test('can be bypassed using "disableValidation" option', async t => {
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
    ormFactory.models(app.orm, {
        schema: 1
    });
    await new app.orm.models.Test({
        name: ''
    }).save(null, {
        disableValidation: true
    });
    t.pass();
});
test('respects other plugin system attributes', async t => {
    let app = appFactory();
    t.plan(4);
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
        name: 'test'
    });
    t.deepEqual(test.getSystemAttributes(), [
        'id'
    ]);
    test.hasTimestamps = true;
    t.deepEqual(test.getSystemAttributes(), [
        'id',
        'created_at',
        'updated_at'
    ]);
    test.softActivated = true;
    t.deepEqual(test.getSystemAttributes(), [
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
        'restored_at'
    ]);
    test.hasTimestamps = false;
    t.deepEqual(test.getSystemAttributes(), [
        'id',
        'deleted_at',
        'restored_at'
    ]);
});