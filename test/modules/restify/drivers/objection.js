// Dependencies
import test from 'ava';
import Parser from '../../../../src/modules/restify/parser';
import Komapi from '../../../../src/index';
import ormFactory from '../../../fixtures/ormFactory';

// Init
const restSchema = {
    title: 'Test Schema',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
    },
};
const noDefaultSchema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Komapi REST query parameters',
    type: 'object',
    properties: {
        $filter: {
            description: 'Filter result set',
            type: 'string',
        },
        $sort: {
            description: 'Sort the result set',
            type: 'array',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
        $skip: {
            description: 'Skip this amount of records (offset)',
            type: 'integer',
            minimum: 0,
        },
        $top: {
            description: 'Limit number of records to this number',
            type: 'integer',
            minimum: 1,
            maximum: 100,
        },
        $expand: {
            description: 'Expand related objects',
            type: 'array',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
        $select: {
            description: 'Limit returned attributes to these attributes',
            type: 'array',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
        $count: {
            description: 'Add total number of records to response',
            type: 'boolean',
        },
    },
};

// Tests
test('can handle a blank query to Objection queryBuilder', async (t) => {
    const app = new Komapi();
    await ormFactory(app, {
        schema: 1,
        seed: 10,
    });
    const parser = new Parser(app.orm.Test, {
        querySchema: noDefaultSchema,
    });
    const collection = await parser.apply(app.orm.Test.query());
    t.is(collection.length, 10);
    t.deepEqual(collection[4], { id: 5 });
});
test('can apply a restify query to an Objection queryBuilder', async (t) => {
    const app = new Komapi();
    await ormFactory(app, {
        schema: 1,
        timestamps: true,
        seed: 10,
    });
    const parser = new Parser(app.orm.Test);
    const collection = await parser.apply(app.orm.Test.query(), {
        $select: 'num,created_at',
        $skip: 2,
        $top: 3,
        $sort: '-num,+id',
        $expand: 'reltests',
        '$select[reltests]': 'desc',
        $count: true,
    });
    t.is(collection.length, 3);
    t.deepEqual(collection, [
        {
            id: 8,
            num: 8,
            created_at: null,
            reltests: [
                {
                    id: 15,
                    desc: 'rel-name-8-1',
                },
                {
                    id: 16,
                    desc: 'rel-name-8-2',
                },
            ],
        },
        {
            id: 7,
            num: 7,
            created_at: null,
            reltests: [
                {
                    id: 13,
                    desc: 'rel-name-7-1',
                },
                {
                    id: 14,
                    desc: 'rel-name-7-2',
                },
            ],
        },
        {
            id: 6,
            num: 6,
            created_at: null,
            reltests: [
                {
                    id: 11,
                    desc: 'rel-name-6-1',
                },
                {
                    id: 12,
                    desc: 'rel-name-6-2',
                },
            ],
        },
    ]);
});
test('can apply a restify nested expand', async (t) => {
    const app = new Komapi();
    await ormFactory(app, {
        schema: 1,
        seed: 10,
    });
    const parser = new Parser(app.orm.Test, {
        $expand: ['reltests/test/reltests', 'reltests/test/reltests2', 'reltests2/test'],
    });
    const collection = await parser.apply(app.orm.Test.query(), {
        $expand: 'reltests/test/reltests2,reltests/test/reltests,reltests2/test',
    });
    t.is(collection.length, 10);
    t.deepEqual(collection[0], {
        id: 1,
        reltests: [
            {
                id: 1,
                test: {
                    id: 1,
                    reltests: [
                        { id: 1 },
                        { id: 2 },
                    ],
                    reltests2: [
                        { id: 1 },
                        { id: 2 },
                    ],
                },
            },
            {
                id: 2,
                test: {
                    id: 1,
                    reltests: [
                        { id: 1 },
                        { id: 2 },
                    ],
                    reltests2: [
                        { id: 1 },
                        { id: 2 },
                    ],
                },
            },
        ],
        reltests2: [
            {
                id: 1,
                test: {
                    id: 1,
                },
            },
            {
                id: 2,
                test: {
                    id: 1,
                },
            },
        ],
    });
});
test('uses restSchema if present', async (t) => {
    const app = new Komapi();
    await ormFactory(app, {
        schema: 1,
        seed: 10,
    });
    app.orm.Test.restSchema = restSchema;
    const parser = new Parser(app.orm.Test);
    t.throws(() => {
        parser.apply(app.orm.Test.query(), {
            $select: 'num',
            $skip: 2,
            $top: 3,
        });
    }, 'Invalid query parameters');
});
