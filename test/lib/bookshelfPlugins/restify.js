'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Init
process.setMaxListeners(30); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('returns all rows and columns when no filter is applied', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll();
    t.is(collection.data.length, 10);
    t.is(collection.data.models[0].attributes.name, 'name-1');
    t.is(collection.data.models[0].attributes.id, 1);
});
test('supports sending bookshelf options through oDataFetchAll', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(app.orm.models.Test.oDataFetchAll({
        $filter: 'name eq null'
    }, {
        require: true
    }), 'EmptyResponse');
});
test('supports $top', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $top: 5
    });
    t.is(collection.data.length, 5);
});
test('supports $top with a maximum', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $top: 5
        }, undefined, {
            limit: 3
        });
    }, 'child "&#x24;top" fails because ["&#x24;top" must be less than or equal to 3]');
});
test('supports $skip', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $skip: 5
    });
    t.is(collection.data.length, 5);
    t.is(collection.data.models[0].attributes.name, 'name-6');
    t.is(collection.data.models[0].attributes.id, 6);
});
test('supports multiple filters including non-oData provided values (skipped)', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $skip: 5,
        $top: 2,
        dummy: 'DummyValue'
    });
    t.is(collection.data.length, 2);
    t.is(collection.data.models[0].attributes.name, 'name-6');
    t.is(collection.data.models[0].attributes.id, 6);
});
test('supports $orderby without explicit schema', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $orderby: 'num desc'
    });
    t.is(collection.data.length, 10);
    t.is(collection.data.models[0].attributes.name, 'name-10');
    t.is(collection.data.models[0].attributes.id, 10);
});
test('$orderby throws on invalid columns when using explicit schema of type 1', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 1
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $orderby: 'invalidColumn desc'
        });
    }, 'child "&#x24;orderby" fails because ["&#x24;orderby" at position 0 fails because ["invalidColumn" is not allowed]]');
});
test('$orderby throws on invalid columns when using explicit schema of type 2', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 2
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $orderby: 'invalidColumn desc'
        });
    }, 'child "&#x24;orderby" fails because ["&#x24;orderby" at position 0 fails because ["invalidColumn" is not allowed]]');
});
test('supports $select without explicit schema', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $select: 'id,name'
    });
    t.is(collection.data.length, 10);
    t.is(collection.data.models[0].attributes.name, 'name-1');
    t.is(collection.data.models[0].attributes.num, undefined);
    t.is(collection.data.models[0].attributes.id, 1);
});
test('$select throws on invalid columns when using explicit schema of type 1', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 1,
        hidden: undefined
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $select: 'invalidColumn'
        });
    }, 'child "&#x24;select" fails because ["&#x24;select" at position 0 fails because ["0" must be one of [name, num]]]');
});
test('$select throws on invalid columns when using explicit schema of type 2', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 2,
        hidden: undefined
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $select: 'invalidColumn'
        });
    }, 'child "&#x24;select" fails because ["&#x24;select" at position 0 fails because ["0" must be one of [name, num]]]');
});
test('$select throws on invalid columns when using non-whitelisted columns', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 1,
        visible: ['name']
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $select: 'num'
        });
    }, 'child "&#x24;select" fails because ["&#x24;select" at position 0 fails because ["0" must be one of [name]]]');
});
test('$select throws on invalid columns when using blacklisted columns', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 1,
        hidden: ['name']
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $select: 'name'
        });
    }, 'child "&#x24;select" fails because ["&#x24;select" at position 0 fails because ["0" must be one of [num]]]');
});
test('supports simple $filter', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $filter: "name eq 'name-3' or name eq 'name-7'"
    });
    t.is(collection.data.length, 2);
    t.is(collection.data.models[0].attributes.name, 'name-3');
    t.is(collection.data.models[0].attributes.num, 3);
    t.is(collection.data.models[0].attributes.id, 3);
    t.is(collection.data.models[1].attributes.name, 'name-7');
    t.is(collection.data.models[1].attributes.num, 7);
    t.is(collection.data.models[1].attributes.id, 7);
});
test('supports advanced $filter', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $filter: "(name eq 'name-3' or name eq 'name-7') and num gt 3"
    });
    t.is(collection.data.length, 1);
    t.is(collection.data.models[0].attributes.name, 'name-7');
    t.is(collection.data.models[0].attributes.num, 7);
    t.is(collection.data.models[0].attributes.id, 7);
});
test('supports $filter with eq null', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    await new app.orm.models.Test({
        name: 'test',
        num: null
    }).save();
    let collection = await app.orm.models.Test.oDataFetchAll({
        $filter: 'num eq null'
    });
    t.is(collection.data.length, 1);
    t.is(collection.data.models[0].attributes.name, 'test');
    t.is(collection.data.models[0].attributes.num, null);
    t.is(collection.data.models[0].attributes.id, 11);
});
test('supports $filter with ne null', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    await new app.orm.models.Test({
        name: 'test',
        num: null
    }).save();
    let collection = await app.orm.models.Test.oDataFetchAll({
        $filter: 'num ne null'
    });
    t.is(collection.data.length, 10);
    t.is(collection.data.models[0].attributes.name, 'name-1');
    t.is(collection.data.models[0].attributes.num, 1);
    t.is(collection.data.models[0].attributes.id, 1);
});
test('$filter throws on invalid columns when using explicit schema of type 1', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 1
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: 'invalidColumn eq null'
        });
    }, "The following error occurred: 'unknown attribute invalidColumn in $filter'. Please try again with valid a oData expression");
});
test('$filter throws on invalid columns when using explicit schema of type 2', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm, {
        schema: 2
    });
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: 'invalidColumn eq null'
        });
    }, "The following error occurred: 'unknown attribute invalidColumn in $filter'. Please try again with valid a oData expression");
});
test('$filter throws on invalid expression', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: "name eq 'name-3"
        });
    }, "The following error occurred: 'invalid $filter parameter'. Please try again with valid a oData expression");
});
test('$filter throws on unknown errors', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: 'Price add 2.45 eq 5.00'
        });
    }, 'There was an unknown error in your oData expression. Please try again with valid a oData expression');
});
test('$filter throws on invalid operators', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: 'name add 3'
        });
    }, "The following error occurred: 'invalid operator add in $filter'. Please try again with valid a oData expression");
});
test('$filter throws on invalid operator on null', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: 'name gt null'
        });
    }, "The following error occurred: 'invalid operator gt in $filter for null,'. Please try again with valid a oData expression");
});
test('$filter throws on invalid functions', async t => {
    let app = appFactory();
    t.plan(1);
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    t.throws(() => {
        return app.orm.models.Test.oDataFetchAll({
            $filter: "endswith(name, 's')"
        });
    }, "The following error occurred: 'invalid operator functioncall of type endswith in $filter'. Please try again with valid a oData expression");
});
test('supports the limit helper', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test
        .collection()
        .limit(7)
        .fetch();
    t.is(collection.length, 7);
    t.is(collection.models[0].attributes.name, 'name-1');
    t.is(collection.models[0].attributes.num, 1);
    t.is(collection.models[0].attributes.id, 1);
});
test('supports the limit helper with maximum', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test
        .collection()
        .limit(7, 2)
        .fetch();
    t.is(collection.length, 2);
    t.is(collection.models[0].attributes.name, 'name-1');
    t.is(collection.models[0].attributes.num, 1);
    t.is(collection.models[0].attributes.id, 1);
});
test('supports $count', async t => {
    let app = appFactory();
    app.bookshelf({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: ':memory:'
        }
    });
    await ormFactory.createDatabase(app.orm, {
        seed: 10
    });
    ormFactory.models(app.orm);
    let collection = await app.orm.models.Test.oDataFetchAll({
        $top: 3,
        $skip: 6,
        $count: true
    }, undefined, {
        limit: 3
    });
    t.is(collection.data.length, 3);
    t.is(collection.data.models[0].attributes.name, 'name-7');
    t.is(collection.data.models[0].attributes.id, 7);
    t.is(collection.pagination.$count, 10);
});