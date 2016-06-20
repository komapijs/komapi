'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import Boom from 'boom';
import Joi from 'joi';

// Init
process.setMaxListeners(13); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file
const defaultErrorResponse = {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An internal server error occurred'
};

// Tests
test('uses JSON as default', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw new Error('Dummy error');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', '*/*');
    t.is(res.status, 500);
    t.deepEqual(res.body, defaultErrorResponse);
});
test('supports text when JSON is unacceptable', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw new Error('Dummy error');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', 'text/plain,application/xml');
    t.is(res.status, 500);
    t.deepEqual(res.body, {});
    t.is(res.text, JSON.stringify(defaultErrorResponse, null, 2));
});
test('responds with 406 using JSON for no acceptable response types', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw new Error('Dummy error');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', 'text/html,application/xml');
    t.is(res.status, 406);
    t.deepEqual(res.body, {
        statusCode: 406,
        error: 'Not Acceptable'
    });
});
test('does not provide stacktraces in production', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw new Error('Dummy error');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', '*/*');
    t.is(res.status, 500);
    t.deepEqual(res.body, defaultErrorResponse);
});
test('provides stacktraces in development', async t => {
    let app = appFactory();
    let stack;
    app.use((ctx, next) => {
        const err = new Error('Dummy error');
        stack = err.stack;
        throw err;
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', '*/*');
    t.is(res.status, 500);
    let expectedBody = Object.assign({}, defaultErrorResponse, {stack: stack.split('\n')});
    t.deepEqual(res.body, expectedBody);
});
test('handles stacktraces in array format', async t => {
    let app = appFactory();
    let stack;
    app.use((ctx, next) => {
        const err = new Error('Dummy error');
        stack = err.stack;
        err.stack = err.stack.split('\n');
        throw err;
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', '*/*');
    t.is(res.status, 500);
    let expectedBody = Object.assign({}, defaultErrorResponse, {stack: stack.split('\n')});
    t.deepEqual(res.body, expectedBody);
});
test('supports custom headers when using JSON', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw Boom.unauthorized('invalid password', 'sample');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', '*/*');
    t.is(res.status, 401);
    t.deepEqual(res.body, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'invalid password',
        attributes: {
            error: 'invalid password'
        }
    });
    t.is(res.headers['www-authenticate'], 'sample error="invalid password"');
});
test('supports custom headers when using text', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        throw Boom.unauthorized('invalid password', 'sample');
    });
    const res = await request(app.listen())
        .get('/')
        .set('Accept', 'text/plain,application/xml');
    t.is(res.status, 401);
    t.deepEqual(res.body, {});
    t.is(res.text, JSON.stringify({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'invalid password',
        attributes: {
            error: 'invalid password'
        }
    }, null, 2));
    t.is(res.headers['www-authenticate'], 'sample error="invalid password"');
});
test('natively handles Joi exceptions using 400', async t => {
    let app = appFactory({
        env: 'production'
    });
    let joiError;
    app.use((ctx, next) => {
        const result = Joi.validate({
            key:'invalid'
        }, {
            key: Joi.number()
        });
        joiError = result.error;
        throw result.error;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 400);
    t.deepEqual(res.body, {
        statusCode: 400,
        error: 'Bad Request',
        message: joiError.message,
        validation: {
            data: [],
            errors: joiError.details
        }
    });
});
test('provides an empty details array during Joi exceptions if no details were provided', async t => {
    let app = appFactory({
        env: 'production'
    });
    let joiError;
    app.use((ctx, next) => {
        const result = Joi.validate({
            key:'invalid'
        }, {
            key: Joi.number()
        });
        joiError = result.error;
        delete joiError.details;
        throw result.error;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 400);
    t.deepEqual(res.body, {
        statusCode: 400,
        error: 'Bad Request',
        message: joiError.message,
        validation: {
            data: [],
            errors: []
        }
    });
});