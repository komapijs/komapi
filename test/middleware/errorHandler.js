'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import Boom from 'boom';
import _ from 'lodash';

// Init
process.setMaxListeners(13); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file
const defaultErrorResponse = {
    error: {
        code: '',
        status: 500,
        message: 'An internal server error occurred'
    }
};
const schema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Test schema',
    type: 'object',
    properties: {
        stringvalue: {
            description: 'Should be string',
            type: 'string'
        }
    },
    additionalProperties: false,
    required: [
        'stringvalue'
    ]
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
test('responds with 406 using text for no acceptable response types', async t => {
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
    t.deepEqual(res.text, 'Error: Not Acceptable');
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
    t.is(res.body.error.stack, undefined);
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
    let defaultError = _.cloneDeep(defaultErrorResponse);
    defaultError.error.stack = stack.split('\n');
    t.deepEqual(res.body, defaultError);
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
    let defaultError = _.cloneDeep(defaultErrorResponse);
    defaultError.error.stack = stack.split('\n');
    t.deepEqual(res.body, defaultError);
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
        error: {
            code: '',
            status: 401,
            message: 'invalid password'
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
        error: {
            code: '',
            status: 401,
            message: 'invalid password'
        }
    }, null, 2));
    t.is(res.headers['www-authenticate'], 'sample error="invalid password"');
});
test('natively handles schemaValidationError exceptions using 400', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use((ctx, next) => {
        ctx.request.body = {
            stringvalue: 1234
        };
        return next();
    });
    app.use(app.mw.ensureSchema(schema));
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 400);
    t.deepEqual(res.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid data provided',
            errors: {
                stringvalue: {
                    message: 'should be string',
                    schemaPath:'#/properties/stringvalue/type',
                    data: 1234
                }
            }
        }

    });
});
test('provides an empty errors object during schemaValidationError exceptions if no details were provided', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use(app.mw.ensureSchema(schema));
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 400);
    t.deepEqual(res.body, {
        error: {
            code: '',
            status: 400,
            message: 'No data provided',
            errors: {}
        }
    });
});
test('handles invalid error objects gracefully', async t => {
    let app = appFactory({
        env: 'development'
    });
    class invalidError {
        constructor(){}
    }
    app.use((ctx, next) => {
        throw new invalidError;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 500);
    t.is(res.body.error.message, 'An internal server error occurred');
    t.is(res.body.error.stack[0], 'Error: Cannot wrap non-Error object');
});