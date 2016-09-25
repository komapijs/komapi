'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../../../src/index';
import {agent as request} from 'supertest-as-promised';

// Tests
test('provides routes for all common rest operations', async t => {
    let app = new Komapi();
    app.use(app.mw.bodyParser());
    let fullBody = {
        key1: 'value1',
        key2: 'value2'
    };
    let patchBody = {
        key2: 'value2'
    };
    let defaultQuery = {
        $top: 10,
        $count: false
    };
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.$registerRoutes.bind(app.service.Rest)));
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
                    query: defaultQuery
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
                    query: defaultQuery
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
                    query: defaultQuery
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
                    query: defaultQuery
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
                    query: defaultQuery
                }
            }
        }
    });
    t.deepEqual(res.delete, {});
});
test('responds 404 by default for an empty response on GET operation', async t => {
    let app = new Komapi();
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.$registerRoutes.bind(app.service.Rest)));
    let res = await request(app.listen()).get('/2');
    t.is(res.status, 404);
});
test('provides a default options route with the different schemas', async t => {
    let app = new Komapi();
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.$registerRoutes.bind(app.service.Rest)));
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
    let app = new Komapi();
    app.services('../../../fixtures/services/blog.js');
    app.use(app.mw.route(app.service.Blog.$registerRoutes.bind(app.service.Blog)));
    let res = await request(app.listen()).options('/');
    t.is(res.status, 404);
    t.is(res.headers.allow, undefined);
});
test('schemas can be overridden', async t => {
    let app = new Komapi();
    app.services('../../../fixtures/services/comment.js');
    app.use(app.mw.route(app.service.Comment.$registerRoutes.bind(app.service.Comment)));
    let res = await request(app.listen()).options('/');
    t.is(res.status, 200);
    t.is(res.headers.allow, 'HEAD, GET, POST');
    t.deepEqual(res.body, {
        data: {
            schemas: {
                data: {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    title: 'Test Schema',
                    type: 'object',
                    properties: {
                        prop: {
                            description: 'Dummy prop',
                            type: 'integer'
                        },
                        prop2: {
                            description: 'Dummy prop2',
                            type: 'integer'
                        }
                    }
                }
            }
        }
    });
});
test('provides data schema validation on create/POST and ignores missing attributes', async t => {
    let app = new Komapi();
    let validData = {
        prop: 1
    };
    let invalidData = {
        prop: 'string'
    };
    app.use(app.mw.bodyParser());
    app.services('../../../fixtures/services/comment.js');
    app.use(app.mw.route(app.service.Comment.$registerRoutes.bind(app.service.Comment)));
    let res1 = await request(app.listen()).post('/').send(validData);
    let res2 = await request(app.listen()).post('/').send(invalidData);
    t.is(res1.status, 200);
    t.deepEqual(res1.body, {data: validData});
    t.is(res2.status, 400);
    t.deepEqual(res2.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid data provided',
            errors: [{
                path: '/prop',
                keyword: 'type',
                message: 'should be integer',
                data: 'string'
            }]
        }
    });
});
test('provides data schema validation on update/PUT and requires all properties', async t => {
    let app = new Komapi();
    let validData = {
        prop: 1,
        prop2: 2
    };
    let missingData = {
        prop: 1
    };
    let invalidData = {
        prop: 1,
        prop2: 'string'
    };
    app.use(app.mw.bodyParser());
    app.services('../../../fixtures/services/comment.js');
    app.use(app.mw.route(app.service.Comment.$registerRoutes.bind(app.service.Comment)));
    let res1 = await request(app.listen()).put('/1').send(validData);
    let res2 = await request(app.listen()).put('/1').send(missingData);
    let res3 = await request(app.listen()).put('/1').send(invalidData);
    t.is(res1.status, 200);
    t.deepEqual(res1.body, {data: validData});
    t.is(res2.status, 400);
    t.deepEqual(res2.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid data provided',
            errors: [{
                path: '/prop2',
                keyword: 'required',
                message: 'should be present',
                data: null
            }]
        }
    });
    t.is(res3.status, 400);
    t.deepEqual(res3.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid data provided',
            errors: [{
                path: '/prop2',
                keyword: 'type',
                message: 'should be integer',
                data: 'string'
            }]
        }
    });
});
test('provides data schema validation on patch/PATCH and ignores missing attributes', async t => {
    let app = new Komapi();
    let validData = {
        prop: 1
    };
    let invalidData = {
        prop: 'string'
    };
    app.use(app.mw.bodyParser());
    app.services('../../../fixtures/services/comment.js');
    app.use(app.mw.route(app.service.Comment.$registerRoutes.bind(app.service.Comment)));
    let res1 = await request(app.listen()).patch('/1').send(validData);
    let res2 = await request(app.listen()).patch('/1').send(invalidData);
    t.is(res1.status, 200);
    t.deepEqual(res1.body, {data: validData});
    t.is(res2.status, 400);
    t.deepEqual(res2.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid data provided',
            errors: [{
                path: '/prop',
                keyword: 'type',
                message: 'should be integer',
                data: 'string'
            }]
        }
    });
});
test('provides query schema validation on find', async t => {
    let app = new Komapi();
    app.services('../../../fixtures/services/rest.js');
    app.use(app.mw.route(app.service.Rest.$registerRoutes.bind(app.service.Rest)));
    let res1 = await request(app.listen()).get('/?$top=7');
    let res2 = await request(app.listen()).get('/?$top=asd');
    t.is(res1.status, 200);
    t.deepEqual(res1.body, {
        data: {
            method: 'find',
            args: {
                params: {
                    user: null,
                    query: {
                        $top: 7,
                        $count: false
                    }
                }
            }
        }
    });
    t.is(res2.status, 400);
    t.deepEqual(res2.body, {
        error: {
            code: '',
            status: 400,
            message: 'Invalid query parameters',
            errors: [{
                path: '/$top',
                keyword: 'type',
                message: 'should be integer',
                data: 'asd'
            }]
        }
    });
});