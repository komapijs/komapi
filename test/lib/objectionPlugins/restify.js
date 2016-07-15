'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Tests
test('is enabled through .restifyFilter method', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({count:true}).withMeta('full').then();
    t.is(collection['@count'], 10);
    t.is(collection.value.length, 10);
});
test('provides helper for getting relevant columns', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.deepEqual(app.orm.Test.getAllColumns(['additionalCol']), [
        'id',
        'additionalCol'
    ]);
});
test('provides helper for getting relevant columns using the jsonSchema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10,
        schema: 1
    });
    t.deepEqual(app.orm.Test.getAllColumns(), ['id'].concat(Object.keys(app.orm.Test.jsonSchema.properties)));
    t.deepEqual(app.orm.Test.getAllColumns(['additionalCol']), [
        'id',
        'additionalCol'
    ]);
});
test('hides all non-id columns by default', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter().withMeta('full').then();
    t.is(collection.value[0].id, 1);
    t.is(collection.value[0].name, undefined);
});
test('hides all relations by default', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter().withMeta('full').then();
    t.is(collection.value[0].id, 1);
    t.is(collection.value[0].reltests, undefined);
});
test('supports filter', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        select: ['name'],
        filter: {
            name: 'name-3'
        }
    }).withMeta('full').then();
    t.is(collection.value[0].id, 3);
    t.is(collection.value[0].name, 'name-3');
});
test('supports select', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        select: ['name']
    }).withMeta('full').then();
    t.is(collection.value[0].id, 1);
    t.is(collection.value[0].name, 'name-1');
});
test('supports expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        expand: ['reltests']
    }).withMeta('full').then();
    let collection2 = await app.orm.Test.query().restifyFilter({
        expand: []
    }).withMeta('full').then();
    let model = collection.value[2];
    t.is(model.id, 3);
    t.deepEqual(model.reltests, [
        {
            id: (model.id * 2) - 1,
            test_id: model.id
        },
        {
            id: (model.id * 2),
            test_id: model.id
        }
    ]);
    t.deepEqual(collection2.value[1].reltests, undefined);
});
test('supports simple expand and select on simple expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        expand: ['reltests'],
        expandSelect: {
            reltests: ['desc']
        }
    }).withMeta('full').then();
    let model = collection.value[2];
    t.is(model.id, 3);
    t.deepEqual(model.reltests, [
        {
            id: (model.id * 2) - 1,
            test_id: model.id,
            desc: `rel-name-${model.id}-1`
        },
        {
            id: (model.id * 2),
            test_id: model.id,
            desc: `rel-name-${model.id}-2`
        }
    ]);
});
test('supports nested expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        expand: ['reltests/test'],
        expandSelect: {
            reltests: ['desc']
        }
    }).withMeta('full').then();
    let model = collection.value[2];
    t.is(model.id, 3);
    t.deepEqual(model.reltests, [
        {
            id: (model.id * 2) - 1,
            test_id: model.id,
            desc: `rel-name-${model.id}-1`,
            test: {
                id: model.id,
            }
        },
        {
            id: (model.id * 2),
            test_id: model.id,
            desc: `rel-name-${model.id}-2`,
            test: {
                id: model.id,
            }
        }
    ]);
});
test('supports complex expand and select on complex expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        expand: ['reltests/test/reltests2', 'reltests/test/reltests'],
        expandSelect: {
            'reltests/test/reltests2': ['desc']
        }
    }).withMeta('full').then();
    let model = collection.value[2];
    let expected = [
        {
            id: (model.id * 2) - 1,
            test_id: model.id,
            test: {
                id: model.id,
                reltests: [
                    {
                        id: (model.id * 2) - 1,
                        test_id: model.id
                    },
                    {
                        id: (model.id * 2),
                        test_id: model.id
                    }
                ],
                reltests2: [
                    {
                        id: (model.id * 2) - 1,
                        test_id: model.id,
                        desc: `rel2-name-${model.id}-1`
                    },
                    {
                        id: (model.id * 2),
                        test_id: model.id,
                        desc: `rel2-name-${model.id}-2`
                    }
                ]
            }
        },
        {
            id: (model.id * 2),
            test_id: model.id,
            test: {
                id: model.id,
                reltests: [
                    {
                        id: (model.id * 2) - 1,
                        test_id: model.id
                    },
                    {
                        id: (model.id * 2),
                        test_id: model.id
                    }
                ],
                reltests2: [
                    {
                        id: (model.id * 2) - 1,
                        test_id: model.id,
                        desc: `rel2-name-${model.id}-1`
                    },
                    {
                        id: (model.id * 2),
                        test_id: model.id,
                        desc: `rel2-name-${model.id}-2`
                    }
                ]
            }
        }
    ];
    t.is(model.id, 3);
    t.deepEqual(model.reltests, expected);
});
test('supports sort', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        sort: ['-id']
    }).withMeta('full').then();
    let collection2 = await app.orm.Test.query().restifyFilter({
        sort: ['+id']
    }).withMeta('full').then();
    let collection3 = await app.orm.Test.query().restifyFilter({
        sort: ['id']
    }).withMeta('full').then();
    t.is(collection.value.length, 10);
    t.is(collection.value[0].id, 10);
    t.is(collection2.value.length, 10);
    t.is(collection2.value[0].id, 1);
    t.is(collection3.value.length, 10);
    t.is(collection3.value[0].id, 1);
});
test('supports limit', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        limit: 3
    }).withMeta('full').then();
    t.is(collection.value.length, 3);
});
test('supports offset', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        offset: 3
    }).withMeta('full').then();
    t.is(collection.value.length, 7);
    t.is(collection.value[0].id, 4);
});
test('omits database-only attributes when printing', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().restifyFilter({
        expand: ['reltests'],
        expandSelect: {
            reltests: ['desc']
        }
    }).withMeta('full').then();
    let model = collection.value[2].toJSON();
    t.is(model.id, 3);
    t.deepEqual(model.reltests, [
        {
            id: (model.id * 2) - 1,
            desc: `rel-name-${model.id}-1`
        },
        {
            id: (model.id * 2),
            desc: `rel-name-${model.id}-2`
        }
    ]);
});