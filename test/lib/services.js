// Dependencies
import test from 'ava';
import Komapi from '../../src/index';

// Tests
test('loads services through the services() method', async (t) => {
    const app = new Komapi();
    app.services('../fixtures/services');
    t.is(Object.keys(app.service).length, 4);
    t.not(app.service.User, undefined);
    t.not(app.service.Comment, undefined);
});
test('can load a single service', async (t) => {
    const app = new Komapi();
    app.services('../fixtures/services/comment.js');
    t.is(Object.keys(app.service).length, 1);
    t.is(app.service.User, undefined);
    t.not(app.service.Comment, undefined);
});
test('adds hooks automatically', async (t) => {
    const app = new Komapi();
    app.services('../fixtures/services');
    const id = 10;
    const res1 = await app.service.User.getWithHooks(id);
    const res2 = await app.service.User.get(id);
    t.is(res1, id + 2);
    t.is(res2, id);
});
