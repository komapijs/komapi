'use strict';

// Dependencies
import test from 'ava';
import Resource from '../../../src/modules/rest/resource';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('provides default routes', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    const resource = new Resource(app.orm.Test, undefined, app);
    app.use('/users', resource.read());
    const res = await request(app.listen())
        .get('/users');
    t.deepEqual(res.body, {
        value: [
            {id: 1},
            {id: 2},
            {id: 3},
            {id: 4},
            {id: 5},
            {id: 6},
            {id: 7},
            {id: 8},
            {id: 9},
            {id: 10}
        ]
    });
});