'use strict';

// Dependencies
import test from 'ava';
import appFactory from './fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import DummyLogger from './fixtures/dummyLogger';
import Knex from 'knex';

// Init
process.setMaxListeners(40); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('accepts default development configuration', t => {
    t.notThrows(() => {
        appFactory(false);
    });
});
test('accepts default production configuration', t => {
    t.notThrows(() => {
        appFactory({env:'production'});
    });
});
test('throws on invalid configuration', t => {
    t.throws(() => {
        appFactory({
            env: 'invalidEnvironment'
        });
    }, 'komapi.env should be equal to one of the allowed values');
});
test('maps Komapi config to Koa config properties', t => {

    // Setup
    let initialConfig = {
        env: 'production',
        name: 'testname',
        proxy: true,
        subdomainOffset: 3
    };
    let app = appFactory(initialConfig);

    // Check
    Object.keys(initialConfig).forEach((i) => {
        t.is(app[i], initialConfig[i]);
        t.is(app.config[i], initialConfig[i]);
    });
});
test('allows Koa config properties to be set directly and be visible through the Koa properties and the Komapi config object ', t => {

    // Setup
    let initialConfig = {
        env: 'production',
        name: 'testname',
        proxy: true,
        subdomainOffset: 3
    };
    let modifiedConfig = {
        env: 'development',
        name: 'anothertestname',
        proxy: false,
        subdomainOffset: 1
    };
    let app = appFactory(initialConfig);

    // Check
    Object.keys(modifiedConfig).forEach((i) => {
        app[i] = modifiedConfig[i];
        t.is(app[i], modifiedConfig[i]);
        t.is(app.config[i], modifiedConfig[i]);
    });
});
test('allows config properties to be set on the Komapi config object and be visible through the Koa properties and the Komapi config object', t => {

    // Setup
    let initialConfig = {
        env: 'production',
        name: 'testname',
        proxy: true,
        subdomainOffset: 3
    };
    let modifiedConfig = {
        env: 'development',
        name: 'anothertestname',
        proxy: false,
        subdomainOffset: 1
    };
    let app = appFactory(initialConfig);

    // Check
    Object.keys(modifiedConfig).forEach((i) => {
        app.config[i] = modifiedConfig[i];
        t.is(app[i], modifiedConfig[i]);
        t.is(app.config[i], modifiedConfig[i]);
    });
});
test('gives a simple representation of itself through json', t => {
    let app = appFactory();
    let out = app.toJSON();
    t.deepEqual(Object.keys(out), [
        'config',
        'state'
    ]);
    t.is(out.config, app.config);
    t.is(out.state, app.state);
});
test('emits an error event on errors', async t => {
    let app = appFactory();
    t.plan(2);

    app.on('error', (err) => {
        t.pass();
    });
    app.use((ctx, next) => {
        throw new Error('Uncaught exception');
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 500);
});
test('logs any emitted errors', t => {
    let app = appFactory();
    t.plan(4);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.context, 'application');
            t.is(obj.level, 50);
            t.is(obj.msg, 'Application Error');
            t.is(obj.err.message, 'Dummy Error');
        })
    });
    app.emit('error', new Error('Dummy Error'));
});
test('logs error stack traces (strings) as array', t => {
    let app = appFactory();
    const err = new Error('Dummy Error');
    const expectedStack = err.stack.split('\n');
    t.plan(2);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.err.message, 'Dummy Error');
            t.deepEqual(obj.err.stack, expectedStack);
        })
    });
    app.emit('error', err);
});
test('logs error stack traces (array) as array', t => {
    let app = appFactory();
    const err = new Error('Dummy Error');
    const expectedStack = err.stack = err.stack.split('\n');
    t.plan(2);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.err.message, 'Dummy Error');
            t.deepEqual(obj.err.stack, expectedStack);
        })
    });
    app.emit('error', err);
});
test('logs uncaught exceptions and exits with a non-zero exit code', async t => {
    t.plan(5);
    let listeners = process.listeners('uncaughtException').length;
    let app = appFactory();
    let newListeners = process.listeners('uncaughtException').length;
    let orgExit = process.exit;
    t.is(newListeners, listeners + 1);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.context, 'application');
            t.is(obj.level, 60);
            t.is(obj.msg, 'Uncaught Exception Error');
        })
    });
    process.exit = (code) => {
        process.exit = orgExit;
        t.is(code, 1);
    };
    let handler = process.listeners('uncaughtException')[listeners];
    handler.call(app, new Error('Uncaught Exception'));
});
test('logs unhandled promise rejections and exits with a non-zero exit code', async t => {
    t.plan(5);
    let listeners = process.listeners('unhandledRejection').length;
    let app = appFactory();
    let newListeners = process.listeners('unhandledRejection').length;
    let orgExit = process.exit;
    t.is(newListeners, listeners + 1);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.context, 'application');
            t.is(obj.level, 60);
            t.is(obj.msg, 'Unhandled Rejected Promise');
        })
    });
    process.exit = (code) => {
        process.exit = orgExit;
        t.is(code, 1);
    };
    let handler = process.listeners('unhandledRejection')[listeners];
    handler.call(app, new Error('Rejected Promise'), new Promise(()=>{},()=>{}));
});
test('logs a warning when using a high number of middlewares', async t => {
    let app = appFactory();
    let num = 4000 + 1;
    let defaultmw = app.middleware.length;
    for (let i = 0;i<(num-defaultmw);i++) {
        app.use((ctx, next) => next());
    }
    t.plan(2);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.msg === `Komapi was started with ${num} middlewares. Please note that more than 4000 middlewares is not supported and could cause stability and performance issues.`) {
                t.is(obj.context, 'application');
                t.is(obj.level, 40);
            }
        })
    });
    await request(app.listen())
        .get('/');
});
test('does not provide a default route', async t => {
    let app = appFactory();
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 404);
});
test('provides a helper method (ctx.sendIf) to send the response if found', async t => {
    let app = appFactory();
    let reply = {status:'ok'};
    app.use((ctx, next) => ctx.sendIf(reply));
    const res = await request(app.listen())
        .get('/');
    t.deepEqual(JSON.stringify(res.body), JSON.stringify(reply));
    t.is(res.status, 200);
});
test('provides a helper method (ctx.sendIf) to send the response, statusCode and headers, if found', async t => {
    let app = appFactory();
    let reply = {status:'ok'};
    app.use((ctx, next) => ctx.sendIf(reply, 201, {
        'X-TMP': 'TEST'
    }));
    const res = await request(app.listen())
        .get('/');
    t.deepEqual(JSON.stringify(res.body), JSON.stringify(reply));
    t.is(res.headers['x-tmp'], 'TEST');
    t.is(res.status, 201);
});
test('provides a helper method (ctx.sendIf) to send a 404 if the response was not found', async t => {
    let app = appFactory();
    let reply = null;
    app.use((ctx, next) => ctx.sendIf(reply));
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 404);
});
test('provides a helper method (ctx.send) to send the response', async t => {
    let app = appFactory();
    let reply = {status:'ok'};
    app.use((ctx, next) => ctx.send(reply));
    const res = await request(app.listen())
        .get('/');
    t.deepEqual(JSON.stringify(res.body), JSON.stringify(reply));
    t.is(res.status, 200);
});
test('provides a helper method (ctx.send) to send the response, statusCode and headers', async t => {
    let app = appFactory();
    let reply = null;
    app.use((ctx, next) => ctx.send(reply, 201, {
        'X-TMP': 'TEST'
    }));
    const res = await request(app.listen())
        .get('/');
    t.deepEqual(JSON.stringify(res.body), JSON.stringify({}));
    t.is(res.headers['x-tmp'], 'TEST');
    t.is(res.status, 201);
});
test('provides a helper method (ctx.send) to send the response even if it was not found', async t => {
    let app = appFactory();
    let reply = null;
    app.use((ctx, next) => ctx.send(reply));
    const res = await request(app.listen())
        .get('/');
    t.deepEqual(JSON.stringify(res.body), JSON.stringify({}));
    t.is(res.status, 204);
});
test('restricts default logging depending on environment', async t => {
    let devApp = appFactory({
        env: 'development'
    });
    let prodApp = appFactory({
        env: 'production'
    });
    t.is(devApp.log.level(), 20);
    t.is(prodApp.log.level(), 30);
});
test('is mountable with a route prefix', async t => {
    let app = appFactory({
        routePrefix: '/test'
    });
    app.use((ctx, next) => ctx.send({status:'ok'}));
    const res = await request(app.listen());
    const res1 = await res.get('/');
    const res2 = await res.get('/test');
    t.is(res1.status, 404);
    t.is(res2.status, 200);
});
test('sets some development values by default', async t => {
    let app = appFactory();
    t.plan(2);
    t.is(app.log.streams.length, 2);
    app.use((ctx, next) => {
        t.false(ctx.state.cache);
    });
    await request(app.listen())
        .get('/');
});
test('sets some production values in production', async t => {
    let app = appFactory({
        env: 'production'
    });
    t.plan(2);
    t.is(app.log.streams.length, 2);
    app.use((ctx, next) => {
        t.true(ctx.state.cache);
    });
    await request(app.listen())
        .get('/');
});
test('supports adding multiple middlewares at once', async t => {
    let app = appFactory();
    t.plan(5);

    app.use(...[
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        }
    ]);
    await request(app.listen())
        .get('/');
});
test('supports mounting middleware at specific routes', async t => {
    let app = appFactory();
    t.plan(3);
    app.use('/route1', ...[
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        }
    ]);
    app.use('/route2', ...[
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        },
        (ctx, next) => {
            t.pass();
            return next();
        }
    ]);
    await request(app.listen())
        .get('/route2');
});
test('does not enable orm by default', async t => {
    let app = appFactory();
    t.is(app.orm, undefined);
});
test('orm cannot be enabled more than once', async t => {
    let app = appFactory();
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    t.throws(() => {
        app.objection({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });
    }, 'Cannot initialize ORM more than once');
});
test('orm can be enabled through objection() method using a config object', async t => {
    let app = appFactory();
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    t.is(typeof app.orm, 'object');
    t.is(typeof app.orm.$Model.knex, 'function');
});
test('orm can be enabled through objection() method using a knex instance', async t => {
    let app = appFactory();
    let knex = Knex({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    app.objection({
        knex: knex
    });
    t.is(typeof app.orm, 'object');
    t.is(typeof app.orm.$Model.knex, 'function');
});
test('orm query errors are logged', async t => {
    let app = appFactory();
    t.plan(4);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            t.is(obj.context, 'orm');
            t.is(obj.level, 50);
            t.is(obj.msg, 'ORM Query Error');
        })
    });
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    try {
        await app.orm.$Model.knex().raw('select * from InvalidTable');
    } catch (err) {
        t.pass();
    }
});
test('migrations can be run before starting the app', async t => {
    let app = appFactory();
    t.plan(1);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (/migration/.test(obj.msg)) {
                t.fail();
            }
        })
    });
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        },
        migrations: {
            directory: 'fixtures/migrations',
            tableName: 'migrations'
        }
    });
    await app.orm.$Model.knex().migrate.latest();
    await app.healthCheck();
    t.pass();
});
test('pending migrations are logged', async t => {
    let app = appFactory();
    t.plan(3);
    app.log.addStream({
        name: 'DummyLogger',
        level: 'info',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (/migration/.test(obj.msg)) {
                t.is(obj.context, 'orm');
                t.is(obj.level, 40);
                t.is(obj.msg, 'There are pending migrations! Run `app.orm.$migrate.latest()` to run all pending migrations.');
            }
        })
    });
    app.objection({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        },
        migrations: {
            directory: 'fixtures/migrations',
            tableName: 'migrations'
        }
    });
    await app.healthCheck();
});
test('listen supports callbacks', async t => {
    let app = appFactory();
    t.plan(2);
    app.use((ctx, next) => {
        ctx.body = null;
    });
    const res = await request(await app.listen(() => t.pass()))
        .get('/');
    t.is(res.status, 204);
});
test('adding middlewares with missing dependency results in normal behaviour', async t => {
    let app = appFactory();
    function dummyMiddleware(){}
    dummyMiddleware.registerBefore = 'non-existant-mw';
    app.use(dummyMiddleware);
    t.deepEqual(app.middleware[app.middleware.length - 1], dummyMiddleware);
});
test('ignores X-Request-ID from untrusted proxy', async t => {
    let app = appFactory();
    let reqId = '1234';
    let res = await request(app.listen())
        .get('/')
        .set({
            'X-Request-ID': reqId
        });
    t.not(res.headers['x-request-id'], reqId);
});
test('respects X-Request-ID from trusted proxy', async t => {
    let app = appFactory({
        proxy: true
    });
    let reqId = '1234';
    let res = await request(app.listen())
        .get('/')
        .set({
            'X-Request-ID': reqId
        });
    t.is(res.headers['x-request-id'], reqId);
});