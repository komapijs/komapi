'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';

// Tests
test('loads services through the services() method', async t => {
    let app = appFactory();
    app.services('../fixtures/services');
    t.is(Object.keys(app.service).length, 3);
    t.not(app.service.User, undefined);
    t.not(app.service.Comment, undefined);
});
test('can load a single service', async t => {
    let app = appFactory();
    app.services('../fixtures/services/comment.js');
    t.is(Object.keys(app.service).length, 1);
    t.is(app.service.User, undefined);
    t.not(app.service.Comment, undefined);
});
test('adds hooks automatically', async t => {
    let app = appFactory();
    app.services('../fixtures/services');
    let id = 10;
    let res1 = await app.service.User.findWithHooks(id);
    let res2 = await app.service.User.find(id);
    t.is(res1, id + 2);
    t.is(res2, id);
});