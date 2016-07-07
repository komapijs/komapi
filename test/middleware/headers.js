'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through app.mw.headers() method', async t => {
    let app = appFactory();
    app.use(app.mw.headers());
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['x-content-type-options'], 'nosniff');
});
test('uses hsts headers by default when using https', async t => {
    let app = appFactory();
    app.use((ctx, next) => {
        ctx.req.socket = { encrypted: true };
        return next();
    });
    app.use(app.mw.headers());
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 200);
    t.is(res.headers['strict-transport-security'], 'max-age=86400');
});
test('supports options', async t => {
    let app = appFactory();
    app.use((ctx, next) => {
        ctx.req.socket = { encrypted: true };
        return next();
    });
    app.use(app.mw.headers({
        hsts: {
            maxAge: 12345 * 1000
        }
    }));
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 200);
    t.is(res.headers['strict-transport-security'], 'max-age=12345');
});
test('throws if it encounters an internal error', async t => {
    let app = appFactory();
    app.use((ctx, next) => {
        ctx.response.setHeader = () => {
            throw new Error('Dummy Error');
        };
        return next();
    });
    app.use(app.mw.headers());
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 500);
});