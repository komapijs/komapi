'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';

// Tests
test('loads models through the models() method', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    app.models('../fixtures/models');
    t.is(Object.keys(app.orm.models).length, 3);
});
test('can load a single model', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    app.models('../fixtures/models/user.js');
    t.is(Object.keys(app.orm.models).length, 1);
});
test('does not allow loading models without a bookshelf instance', async t => {
    let app = appFactory();
    t.throws(() => {
        app.models('../fixtures/models');
    }, 'Cannot load models before initializing a bookshelf instance. Use `app.bookshelf()` before attempting to load models.');
});