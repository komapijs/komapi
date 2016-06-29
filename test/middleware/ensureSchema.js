'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Init
const schema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Test schema',
    type: 'object',
    properties: {
        enumvalue: {
            description: 'Environment',
            type: 'string',
            enum: [
                'development',
                'production'
            ]
        },
        stringvalue: {
            description: 'Should be string',
            type: 'string'
        },
        numbervalue: {
            description: 'Should be string',
            type: 'string'
        }
    },
    additionalProperties: false,
    required: [
        'stringvalue', 'enumvalue'
    ]
};

// Tests
test('provides middleware to ensure requests adheres to a json schema', async t => {
    t.plan(2);
    let app = appFactory({
        env: 'production'
    });
    app.use(async (ctx, next) => {
        ctx.request.body = {
            stringvalue: 1234
        };
        try {
            return await next();
        } catch (err) {
            t.is(err.name, 'SchemaValidationError');
            t.deepEqual(err.errors, {
                enumvalue: {
                    message: 'should be present',
                    schemaPath: '#/required'
                },
                stringvalue: {
                    message: 'should be string',
                    schemaPath: '#/properties/stringvalue/type'
                }
            });
        }
    });
    app.use(app.ensureSchema(schema));
    await request(app.listen())
        .get('/');
});
test('allows valid requests', async t => {
    let app = appFactory({
        env: 'production'
    });
    app.use(async (ctx, next) => {
        ctx.request.body = {
            stringvalue: 'asd',
            enumvalue: 'development'
        };
        try {
            return await next();
        } catch (err) {
            t.fail();
        }
    });
    app.use(app.ensureSchema(schema));
    app.use((ctx, next) => {
        ctx.body = null;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 204);
});
test('throws on invalid key', async t => {
    let app = appFactory({
        env: 'production'
    });
    t.throws(() => {
        app.use(app.ensureSchema(schema, 'invalid'));
    }, `You can not enforce a schema to 'invalid'. Only allowed values are 'body', 'params' or 'query`);
});