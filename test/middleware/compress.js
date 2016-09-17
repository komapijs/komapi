'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../src/index';
import {agent as request} from 'supertest-as-promised';
import crypto from 'crypto';

// Tests
test('is enabled through app.mw.compress() method', async t => {
    let app = new Komapi();
    app.use(app.mw.compress());
    app.use((ctx, next) => {
        ctx.send({
            data: crypto.randomBytes(1024).toString('hex')
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.headers['transfer-encoding'], 'chunked');
});