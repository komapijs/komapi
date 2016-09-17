'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../src/index';

// Tests
test('loads models through the models() method', async t => {
    let app = new Komapi();
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    app.models('../fixtures/models');
    t.is(Object.keys(app.orm).filter((k)=> !k.startsWith('$')).length, 3);
});
test('can load a single model', async t => {
    let app = new Komapi();
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    app.models('../fixtures/models/user.js');
    t.is(Object.keys(app.orm).filter((k)=> !k.startsWith('$')).length, 1);
});
test('does not allow loading models without an objection instance', async t => {
    let app = new Komapi();
    t.throws(() => {
        app.models('../fixtures/models');
    }, 'Cannot load models before initializing an objection instance. Use `app.objection()` before attempting to load models.');
});