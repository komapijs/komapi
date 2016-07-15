'use strict';

// Dependencies
import test from 'ava';
import Schema from '../../src/lib/schema';

// Init
const testSchema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Test schema',
    type: 'object',
    properties: {
        dt: {
            description: 'Datetime',
            type: 'string',
            format: 'date-time'
        }
    }
};

// Tests
test('schema accepts ISO8601 datetime', async t => {
    let schema = new Schema();
    let validate = schema.compile(testSchema);
    let valid = await validate({
        dt: '1997-07-16T19:20:30.45+01:00'
    });
    t.is(valid, true);
});
test('schema rejects non-ISO8601 datetime', async t => {
    let schema = new Schema();
    let validate = schema.compile(testSchema);
    let valid = await validate({
        dt: '1997-14-01'
    });
    t.is(valid, false);
});