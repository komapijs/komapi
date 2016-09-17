'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../src/index';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through app.mw.cors() method', async t => {
    let app = new Komapi();
    app.use(app.mw.cors());
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/')
        .set('Origin', 'http://example.com');
    t.is(res.headers['access-control-allow-origin'], 'http://example.com');
});