'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../src/index';
import {agent as request} from 'supertest-as-promised';

// Tests
test('is enabled through app.mw.views() method', async t => {
    let app = new Komapi();
    app.use(app.mw.views(__dirname + '/../fixtures/views', {
        extension: 'hbs',
        map: {
            hbs: 'handlebars'
        }
    }));
    app.use(async (ctx, next) => {
        return await ctx.render('index', {
            who: 'World'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.text, '<p>Hello World!</p>');
});