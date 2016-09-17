'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../../src/index';
import {agent as request} from 'supertest-as-promised';

// Tests
test('can register routes automatically', async t => {
    let app = new Komapi();
    app.services('../../fixtures/services/user.js');
    app.use(app.mw.route(app.service.User.$registerRoutes.bind(app.service.User)));
    let res1 = await request(app.listen()).get('/find/1');
    let res2 = await request(app.listen()).get('/findWithHooks/1');
    t.is(res1.text, '1');
    t.is(res2.text, '3');
});