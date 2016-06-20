'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through serve() method', async t => {
    let app = appFactory();
    app.serve('/', __dirname + '/../fixtures/static');
    const res = await request(app.listen())
        .get('/');
    t.is(res.text, '<p>Hello World!</p>');
});