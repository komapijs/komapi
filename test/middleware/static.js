'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../src/index';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through app.mw.static() method', async t => {
    let app = new Komapi();
    app.use(app.mw.static(__dirname + '/../fixtures/static'));
    const res = await request(app.listen())
        .get('/');
    t.is(res.text, '<p>Hello World!</p>');
});