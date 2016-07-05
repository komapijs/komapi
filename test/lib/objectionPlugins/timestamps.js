'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../../fixtures/appFactory';
import * as ormFactory from '../../fixtures/ormFactory';

// Init
process.setMaxListeners(11); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file
const schema = {
    invalid: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'Person test schema',
        required: [
            'name'
        ],
        type: 'object',
        additionalProperties: false,
        properties: {
            name: {
                description: 'Person name',
                type: 'string'
            }
        }
    },
    ok: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'Person test schema',
        required: [
            'name'
        ],
        type: 'object',
        additionalProperties: false,
        properties: {
            name: {
                description: 'Person name',
                type: 'string'
            },
            created_at: {
                description: 'Created at',
                type: 'string',
                fromat: 'date-time'
            },
            updated_at: {
                description: 'Updated at',
                type: 'string',
                fromat: 'date-time'
            }
        }
    },
    okCamelCase: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'Person test schema',
        required: [
            'name'
        ],
        type: 'object',
        additionalProperties: false,
        properties: {
            name: {
                description: 'Person name',
                type: 'string'
            },
            createdAt: {
                description: 'Created at',
                type: 'string',
                fromat: 'date-time'
            },
            updatedAt: {
                description: 'Updated at',
                type: 'string',
                fromat: 'date-time'
            }
        }
    }
};

// Tests
test('is not enabled by default', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app);
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    t.is(collection.length, 1);
    t.is(collection[0].name, 'nametest');
    t.is(collection[0].id, 1);
    t.is(collection[0].createdAt, null);
    t.is(collection[0].created_at, null);
    t.is(collection[0].updatedAt, null);
    t.is(collection[0].updated_at, null);
    t.is(collection[0].created_at, collection[0].updated_at);
    t.is(collection[0].createdAt, collection[0].updatedAt);
});
test('is not enabled by default and does not impact schema validation', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        schema: schema.invalid
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    t.is(collection.length, 1);
    t.is(collection[0].name, 'nametest');
    t.is(collection[0].id, 1);
    t.is(collection[0].createdAt, null);
    t.is(collection[0].created_at, null);
    t.is(collection[0].updatedAt, null);
    t.is(collection[0].updated_at, null);
    t.is(collection[0].created_at, collection[0].updated_at);
    t.is(collection[0].createdAt, collection[0].updatedAt);
});
test('is enabled by setting timestamps property', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    t.is(collection.length, 1);
    t.is(collection[0].name, 'nametest');
    t.is(collection[0].id, 1);
    t.is(collection[0].createdAt, null);
    t.is(typeof collection[0].created_at, 'string');
    t.is(collection[0].updatedAt, null);
    t.is(typeof collection[0].updated_at, 'string');
    t.is(collection[0].created_at, collection[0].updated_at);
    t.is(collection[0].createdAt, collection[0].updatedAt);
});
test('sets updated_at on updates', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with camelCase', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
});
test('throws on invalid jsonSchema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: schema.invalid
    });
    let model = {
        name: 'nametest'
    };
    t.throws(app.orm.Test.query().insert(model), "Invalid jsonSchema for model 'Test'. Add 'created_at' and 'updated_at' to the schema to use timestamps");
});
test('throws on invalid jsonSchema with camelCase', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: schema.invalid,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    t.throws(app.orm.Test.query().insert(model), "Invalid jsonSchema for model 'Test'. Add 'createdAt' and 'updatedAt' to the schema to use timestamps");
});
test('sets updated_at on updates with valid jsonSchema', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: schema.ok
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.created_at;
    t.is(person.createdAt, null);
    t.is(person.updated_at, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.created_at, ct);
    t.not(person.updated_at, ct);
    t.is(typeof person.updated_at, 'string');
    t.is(person.updatedAt, null);
});
test('sets updated_at on updates with valid jsonSchema and camelCase', async t => {
    let app = appFactory();
    await ormFactory.createDatabase(app, {
        timestamps: true,
        schema: schema.okCamelCase,
        camelCase: true
    });
    let model = {
        name: 'nametest'
    };
    await app.orm.Test.query().insert(model).then();
    let collection = await app.orm.Test.query().then();
    let person = collection[0];
    let ct = person.createdAt;
    t.is(person.created_at, null);
    t.is(person.updatedAt, ct);
    await person.$query().patch({name: 'testupdated'}).then();
    person = await person.$query().then();
    t.is(person.name, 'testupdated');
    t.is(person.createdAt, ct);
    t.not(person.updatedAt, ct);
    t.is(typeof person.updatedAt, 'string');
    t.is(person.updated_at, null);
});