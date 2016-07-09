'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Init
process.setMaxListeners(32); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('returns all rows and only id columns when no filter is applied', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter().withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, undefined);
    t.is(collection.data[0].id, 1);
});
test('returns all rows and the columns specified', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query(true).columns(['id', 'name']).oDataFilter().withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, 'name-1');
    t.is(collection.data[0].id, 1);
});
test('can disable meta info using a boolean', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter().withMeta(false).then();
    t.is(collection.data, undefined);
    t.is(collection.length, 10);
    t.is(collection[0].id, 1);
});
test('does not work on $relatedQuery', async t => {
    let app = appFactory();
    t.plan(1);
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    await app.orm.Test.query()
        .findById(7)
        .then((res) => {
            t.throws(() => {
                return res.$relatedQuery('reltests').oDataFilter({
                    $skip: 1
                }).then();
            }, 'res.$relatedQuery(...).oDataFilter is not a function');
        });
});
test('supports $top', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter({
        $top: 5
    }).withMeta().then();
    t.is(collection.data.length, 5);
});
test('supports $skip', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns('name').oDataFilter({
        $skip: 6
    }).withMeta().then();
    t.is(collection.data.length, 4);
    t.is(collection.data[0].name, 'name-7');
    t.is(collection.data[0].id, 7);
});
test('supports multiple filters including non-oData provided values (skipped)', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns('name').oDataFilter({
        $skip: 5,
        $top: 2,
        dummy: 'DummyValue'
    }).withMeta().then();
    t.is(collection.data.length, 2);
    t.is(collection.data[0].name, 'name-6');
    t.is(collection.data[0].id, 6);
});
test('supports $orderby', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns('name').oDataFilter({
        $orderby: 'num desc'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, 'name-10');
    t.is(collection.data[0].id, 10);
});
test('$orderby throws on invalid columns with explicit schema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10,
        schema: 1
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $orderby: 'invalidColumn desc'
        }).withMeta().then();
    }, "The following error occurred: 'unknown attribute invalidColumn in $orderby'. Please try again with valid a oData expression");
});
test('supports $select', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter({
        $select: 'name'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, 'name-1');
    t.is(collection.data[0].num, undefined);
    t.is(collection.data[0].id, 1);
});
test('$select throws on invalid columns with explicit schema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10,
        schema: 1
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $select: 'invalidColumn'
        }).withMeta().then();
    }, "The following error occurred: 'unknown attributes invalidColumn in $select'. Please try again with valid a oData expression");
});
test('supports simple $filter', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns(['name', 'num']).oDataFilter({
        $filter: "name eq 'name-3' or name eq 'name-7'"
    }).withMeta().then();
    t.is(collection.data.length, 2);
    t.is(collection.data[0].name, 'name-3');
    t.is(collection.data[0].num, 3);
    t.is(collection.data[0].id, 3);
    t.is(collection.data[1].name, 'name-7');
    t.is(collection.data[1].num, 7);
    t.is(collection.data[1].id, 7);
});
test('supports advanced $filter', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns(['name', 'num']).oDataFilter({
        $filter: "(name eq 'name-3' or name eq 'name-7') and num gt 3"
    }).withMeta().then();
    t.is(collection.data.length, 1);
    t.is(collection.data[0].name, 'name-7');
    t.is(collection.data[0].num, 7);
    t.is(collection.data[0].id, 7);
});
test('supports $filter with eq null', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    await app.orm.Test.query().insert({
        name: 'test',
        num: null
    }).then();
    let collection = await app.orm.Test.query().columns(['name', 'num']).oDataFilter({
        $filter: 'num eq null'
    }).withMeta().then();
    t.is(collection.data.length, 1);
    t.is(collection.data[0].name, 'test');
    t.is(collection.data[0].num, null);
    t.is(collection.data[0].id, 11);
});
test('supports $filter with ne null', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns(['name', 'num']).oDataFilter({
        $filter: 'num ne null'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, 'name-1');
    t.is(collection.data[0].num, 1);
    t.is(collection.data[0].id, 1);
});
test('$filter throws on invalid columns when using explicit schema of type 1', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10,
        schema: 1
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: 'invalidColumn eq null'
        }).withMeta().then();
    }, "The following error occurred: 'unknown attribute invalidColumn in $filter'. Please try again with valid a oData expression");
});

test('$filter throws on invalid expression', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: "name eq 'name-3"
        }).withMeta().then();
    }, "The following error occurred: 'invalid $filter parameter'. Please try again with valid a oData expression");
});
test('$filter throws on unknown errors', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: 'Price add 2.45 eq 5.00'
        }).withMeta().then();
    }, 'There was an unknown error in your oData expression. Please try again with valid a oData expression');
});
test('$filter throws on invalid operators', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: 'name add 3'
        }).withMeta().then();
    }, "The following error occurred: 'invalid operator add in $filter'. Please try again with valid a oData expression");
});
test('$filter throws on invalid operator on null', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: 'name gt null'
        }).withMeta().then();
    }, "The following error occurred: 'invalid operator gt in $filter for null,'. Please try again with valid a oData expression");
});
test('$filter throws on invalid functions', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(() => {
        return app.orm.Test.query().oDataFilter({
            $filter: "endswith(name, 's')"
        }).withMeta().then();
    }, "The following error occurred: 'invalid operator functioncall of type endswith in $filter'. Please try again with valid a oData expression");
});
test('supports $count', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns(['name']).oDataFilter({
        $top: 3,
        $skip: 6,
        $count: true
    }, {
        limit: 3
    }).withMeta().then();
    t.is(collection.data.length, 3);
    t.is(collection.data[0].name, 'name-7');
    t.is(collection.data[0].id, 7);
    t.is(collection.pagination.$count, 10);
});
test('supports invoking functions directly', async t => {
    let app = appFactory();
    t.plan(6);
    function cb(res) {
        t.is(res.data.length, 10);
        t.is(res.data[0].name, 'name-1');
        t.is(res.data[0].id, 1);
        return res;
    }
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns(['name']).oDataFilter().withMeta().then(cb);
    t.is(collection.data.length, 10);
    t.is(collection.data[0].name, 'name-1');
    t.is(collection.data[0].id, 1);
});
test('supports $expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter({
        $expand: 'reltests'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[3].reltests[1].id, 8);
    t.is(collection.data[3].reltests[1].desc, undefined);
    t.is(collection.data[3].id, 4);
});
test('supports $select with $expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter({
        $select: 'name',
        $expand: 'reltests'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[3].reltests[1].id, 8);
    t.is(collection.data[3].reltests[1].desc, undefined);
    t.is(collection.data[3].name, 'name-4');
    t.is(collection.data[3].id, 4);
});
test('supports complex $select with complex $expand', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().oDataFilter({
        $select: 'reltests/desc,reltests/test/desc,name,reltests2/desc',
        $expand: 'reltests,reltests2'
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[3].reltests[1].id, 8);
    t.is(collection.data[3].reltests[1].desc, 'rel-name-4-2');
    t.is(collection.data[3].id, 4);
});
test('existing functionality of objection (accepting a valid filter) are maintained', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().eager('reltests(testFilter)', {
        testFilter: function (qb) {
            qb.where('id', 1);
        }
    }).withMeta().then();
    t.is(collection.data.length, 10);
    t.is(collection.data[3].reltests[1], undefined);
    t.is(collection.data[0].reltests[1], undefined);
    t.is(collection.data[0].reltests.length, 1);
    t.is(collection.data[0].reltests[0].id, 1);
});
test('existing functionality of objection (throwing on invalid filters) are maintained', async t => {
    let app = appFactory();
    t.plan(1);
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    t.throws(app.orm.Test.query().eager('reltests(missingFilter)').withMeta(), /could not find filter/);
});