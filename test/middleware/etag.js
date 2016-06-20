'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through etag() method', async t => {
    let app = appFactory();
    app.etag();
    app.use((ctx, next) => {
        ctx.send('Hello World');
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['etag'], '"b-sQqNsWTgdUEFt6mb5y4/5Q"');
});
test('supports options as first parameters', async t => {
    let app = appFactory();
    app.etag({
        weak: true
    });
    app.use((ctx, next) => {
        ctx.send('Hello World');
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['etag'], 'W/"b-sQqNsWTgdUEFt6mb5y4/5Q"');
});