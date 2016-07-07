'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through app.mw.etag() method', async t => {
    let app = appFactory();
    app.use(app.mw.etag());
    app.use((ctx, next) => {
        ctx.send('Hello World');
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['etag'], '"b-sQqNsWTgdUEFt6mb5y4/5Q"');
});