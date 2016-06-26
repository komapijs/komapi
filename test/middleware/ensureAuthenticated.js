'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as AnonymousStrategy} from 'passport-anonymous';

// Tests
test('provides middleware to ensure authentication', async t => {
    const app = appFactory();
    t.plan(5);
    const passportUser = {
        id: 1,
        username: 'test'
    };
    app.bodyParser();
    app.authInit(new LocalStrategy(function (username, password, done) {
        if (username === 'test' && password === 'testpw') return done(null, passportUser);
        done(null, false);
    }),
        new AnonymousStrategy()
    );
    app.use(app.authenticate(['local', 'anonymous'], {
        session: false
    }));

    app.use('/protected', app.ensureAuthenticated(), (ctx, next) => {
        t.fail();
        ctx.body = null;
    });
    app.use('/protectedAuthenticated', app.ensureAuthenticated(), (ctx, next) => {
        t.pass();
        ctx.body = null;
    });
    app.use('/unprotected', (ctx, next) => {
        t.pass();
        ctx.body = null;
    });
    const resProtected = await request(app.listen())
        .post('/protected')
        .send({ username: 'test', password: 'tasd' });
    const resProtectedAuthenticated = await request(app.listen())
        .post('/protectedAuthenticated')
        .send({ username: 'test', password: 'testpw' });
    const resUnprotected = await request(app.listen())
        .post('/unprotected')
        .send({ username: 'test', password: 'taad' });
    t.is(resProtected.status, 401);
    t.is(resProtectedAuthenticated.status, 204);
    t.is(resUnprotected.status, 204);
});