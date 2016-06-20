'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through cors() method', async t => {
    let app = appFactory();
    app.cors();
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
test('supports options as first parameters', async t => {
    let app = appFactory();
    app.cors({
        origin: '*'
    });
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/')
        .set('Origin', 'http://example.com');
    t.is(res.headers['access-control-allow-origin'], '*');
});