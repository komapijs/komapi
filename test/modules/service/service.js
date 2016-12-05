// Dependencies
import test from 'ava';
import { agent as request } from 'supertest-as-promised';
import path from 'path';
import Komapi from '../../../src/index';

// Tests
test('can register routes automatically', async (t) => {
    const app = new Komapi();
    app.services(path.join(__dirname, '../../fixtures/services/user.js'));
    app.use(app.mw.route(app.service.User.$getRoutes.bind(app.service.User)));
    const res1 = await request(app.listen()).get('/1');
    const res2 = await request(app.listen()).get('/');
    t.is(res1.text, '1');
    t.is(res2.status, 404);
});
test('provides its own router if not provided', async (t) => {
    const app = new Komapi();
    app.services(path.join(__dirname, '../../fixtures/services/user.js'));
    app.use(app.service.User.$getRoutes().routes());
    const res1 = await request(app.listen()).get('/1');
    const res2 = await request(app.listen()).get('/');
    t.is(res1.text, '1');
    t.is(res2.status, 404);
});
