'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through bodyParser() method', async t => {
    t.plan(3);
    let app = appFactory();
    app.bodyParser();
    app.use((ctx, next) => {
        t.is(ctx.request.body.username, 'test');
        t.is(ctx.request.body.password, 'asdf');
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'asdf' });
    t.is(res.status, 204);
});
test('can be mounted at specific paths', async t => {
    t.plan(6);
    let app = appFactory();
    app.bodyParser('/mount');
    app.use('/mount', (ctx, next) => {
        t.is(ctx.request.body.username, 'test');
        t.is(ctx.request.body.password, 'asdf');
        ctx.body = null;
    });
    app.use('/', (ctx, next) => {
        t.is(ctx.request.body, undefined);
        t.is(ctx.request.body, undefined);
        ctx.body = null;
    });
    const res1 = await request(app.listen())
        .post('/mount')
        .send({ username: 'test', password: 'asdf' });
    const res2 = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'asdf' });
    t.is(res1.status, 204);
    t.is(res2.status, 204);
});
test('supports options as first parameters', async t => {
    t.plan(1);
    let app = appFactory();
    app.bodyParser({
        jsonLimit: 1
    });
    app.use((ctx, next) => {
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'asdf' });
    t.is(res.status, 413);
});