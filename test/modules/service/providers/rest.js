'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('provides routes for all common rest operations', async t => {
    let app = appFactory();
    app.use(app.mw.bodyParser());
    let fullBody = {
        key1: 'value1',
        key2: 'value2'
    };
    let patchBody = {
        key2: 'value2'
    };
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.registerRoutes.bind(app.service.Rest)));
    let r = request(app.listen());
    let res = {
        find: await r.get('/').then((r) => r.body),
        get: await r.get('/1').then((r) => r.body),
        create: await r.post('/').send(fullBody).then((r) => r.body),
        update: await r.put('/1').send(fullBody).then((r) => r.body),
        patch: await r.patch('/1').send(patchBody).then((r) => r.body),
        delete: await r.delete('/1').then((r) => r.body)
    };
    t.deepEqual(res.find, {
        data: {
            method: 'find',
            args: {
                params: {
                    user: null,
                    query: {}
                }
            }
        }
    });
    t.deepEqual(res.get, {
        data: {
            method: 'get',
            args: {
                id: 1,
                params: {
                    user: null,
                    query: {}
                }
            }
        }
    });
    t.deepEqual(res.create, {
        data: {
            method: 'create',
            args: {
                data: fullBody,
                params: {
                    user: null,
                    query: {}
                }
            }
        }
    });
    t.deepEqual(res.update, {
        data: {
            method: 'update',
            args: {
                id: 1,
                data: fullBody,
                params: {
                    user: null,
                    query: {}
                }
            }
        }
    });
    t.deepEqual(res.patch, {
        data: {
            method: 'patch',
            args: {
                id: 1,
                data: patchBody,
                params: {
                    user: null,
                    query: {}
                }
            }
        }
    });
    t.deepEqual(res.delete, {});
});
test('responds 404 by default for an empty response on GET operation', async t => {
    let app = appFactory();
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.registerRoutes.bind(app.service.Rest)));
    let res = await request(app.listen()).get('/2');
    t.is(res.status, 404);
});
test('provides a default options route with the different schemas', async t => {
    let app = appFactory();
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.registerRoutes.bind(app.service.Rest)));
    let res1 = await request(app.listen()).options('/');
    let res2 = await request(app.listen()).options('/1');
    t.is(res1.status, 200);
    t.is(res1.headers.allow, 'HEAD, GET, POST');
    t.deepEqual(res1.body, {
        data: {
            schemas: {
                query: app.service.Rest.$querySchema
            }
        }
    });
    t.is(res2.status, 200);
    t.is(res2.headers.allow, 'HEAD, GET, PUT, PATCH, DELETE');
    t.deepEqual(res2.body, {
        data: {
            schemas: {
                query: app.service.Rest.$querySchema
            }
        }
    });
});
test('options route is disabled if no other routes can be found', async t => {
    let app = appFactory();
    app.services('../../../fixtures/services/blog.js');
    app.use(app.mw.route(app.service.Blog.registerRoutes.bind(app.service.Blog)));
    let res = await request(app.listen()).options('/');
    t.is(res.status, 404);
    t.is(res.headers.allow, undefined);
});
test('schemas can be overridden', async t => {
    let app = appFactory();
    app.services('../../../fixtures/services/comment.js');
    app.use(app.mw.route(app.service.Comment.registerRoutes.bind(app.service.Comment)));
    let res = await request(app.listen()).options('/');
    t.is(res.status, 200);
    t.is(res.headers.allow, 'HEAD, GET');
    t.deepEqual(res.body, {
        data: {
            schemas: {
                data: {
                    $schema: true
                }
            }
        }
    });
});