'use strict';

// Dependencies
import test from 'ava';
import Resource from '../../../src/modules/rest/resource';
import Parser from '../../../src/modules/rest/parser';

// Init
class User {
    static getAllColumns(){
        return ['username'];
    }
}
const resource = new Resource(User);

// Tests
test('sets the correct query parameters', async t => {
    let parser = new Parser(resource.options);
    t.deepEqual(parser.parse({
        $filter: 'filterstring',
        $sort: '+username',
        $top: 7,
        $skip: 2,
        $expand: 'roles',
        $select: 'username',
        '$select[roles]': 'description',
        $count: true
    }), {
        filter: 'filterstring',
        sort: ['+username'],
        limit: 7,
        offset: 2,
        expand: ['roles'],
        expandSelect: {
            roles: ['description']
        },
        select: ['username'],
        count: true
    });
});
test('throws with a descriptive error on invalid query', async t => {
    let parser = new Parser(resource.options);
    t.throws(() => parser.parse({
        $count: 'invalid'
    }), 'Invalid query parameters');
});
test('supports custom schema', async t => {
    let options = Object.assign({}, resource.options);
    options.querySchema = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'Test schema',
        type: 'object',
        properties: {
            $skip: {
                description: 'Skip this amount of records (offset)',
                type: 'integer',
                minimum: 15
            }
        }
    };
    let parser = new Parser(options);
    t.throws(() => parser.parse({
        $skip: 14
    }), 'Invalid query parameters');
});
test('supports limiting expand', async t => {
    let options = Object.assign({}, resource.options);
    options.relations = ['test'];
    let parser = new Parser(options);
    t.throws(() => parser.parse({
        $expand: 'test2'
    }), 'Invalid query parameters');
    let out = parser.parse({
        $expand: 'test'
    });
    t.deepEqual(out.expand, ['test']);
});
test('supports selecting expanded relations', async t => {
    let options = Object.assign({}, resource.options);
    let parser = new Parser(options);
    let out = parser.parse({
        $expand: 'test',
        '$select[test]': 'desc'
    });
    t.deepEqual(out.expand, ['test']);
    t.deepEqual(out.expandSelect, {
        test: ['desc']
    });
});
test('ignores unexpanded relations for selection', async t => {
    let options = Object.assign({}, resource.options);
    let parser = new Parser(options);
    let out = parser.parse({
        '$select[test]': 'desc'
    });
    t.deepEqual(out.expand, undefined);
    t.deepEqual(out.expandSelect, null);
});