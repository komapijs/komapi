'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import crypto from 'crypto';

// Tests
test('is enabled through compress() method', async t => {
    let app = appFactory();
    app.compress();
    app.use((ctx, next) => {
        ctx.send({
            data: crypto.randomBytes(1024).toString('hex')
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['transfer-encoding'], 'chunked');
});
test('supports options as first parameters', async t => {
    let app = appFactory();
    app.compress({
        threshold: '1mb'
    });
    app.use('/route1', (ctx, next) => {
        ctx.send({
            data: crypto.randomBytes(1024).toString('hex')
        });
    });
    app.use('/route2', (ctx, next) => {
        ctx.send({
            data: crypto.randomBytes(1024 * 1024).toString('hex')
        });
    });
    const res = await request(app.listen());
    const res1 = await res.get('/route1');
    const res2 = await res.get('/route2');
    t.is(res1.headers['transfer-encoding'], undefined);
    t.is(res2.headers['transfer-encoding'], 'chunked');
});