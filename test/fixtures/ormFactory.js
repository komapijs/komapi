'use strict';

// Dependencies
import Knex from 'knex';

// Init
let counter = 0;
const knex = Knex({
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
        filename: ':memory:'
    }
});
knex.setMaxListeners(20);

// Exports
export function createDatabase(app, opts = {}) {
    const db = opts.db || 'test' + counter++;
    delete require.cache[require.resolve('objection')];
    app.objection({
        knex: knex
    });
    return Promise.all([
        app.orm.$Model.knex().schema.createTable(db, (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('num');
            table.timestamps();
            table.dateTime('deleted_at');
        }),
        app.orm.$Model.knex().schema.createTable('related-' + db , (table) => {
            table.increments('id').primary();
            table.integer('test_id');
            table.string('desc');
            table.timestamps();
            table.dateTime('deleted_at');
        })
    ]).then(() => {
        if (opts.seed) {
            let rows = [];
            let relRows = [];
            for (let i = 1; i <= opts.seed; i++) {
                let row = {
                    name: `name-${i}`,
                    num: i
                };
                rows.push(row);
                relRows.push({
                    test_id: i,
                    desc: `rel-name-${i}-1`
                });
                relRows.push({
                    test_id: i,
                    desc: `rel-name-${i}-2`
                });
            }
            return Promise.all([
                app.orm.$Model.knex().batchInsert(db, rows),
                app.orm.$Model.knex().batchInsert('related-' + db, relRows)
            ]);
        }
    }).then(() => {
        app.orm.Test = class Test extends app.orm.$Model {
            static get softDelete() {
                return (opts.softDelete === true);
            }
            static get jsonSchema() {
                let schema = null;
                if (opts.schema === 1) {
                    schema = {
                        title: 'Test Schema',
                        type: 'object',
                        properties: {
                            id: {type: 'integer'},
                            name: {type: 'string', minLength: 1, maxLength: 255},
                            num: {type: 'number'}
                        }
                    };
                }
                return schema;
            }
            static get relationMappings() {
                return {
                    reltests: {
                        relation: app.orm.$Model.HasManyRelation,
                        modelClass: app.orm.RelTest,
                        join: {
                            from: db + '.id',
                            to: 'related-' + db + '.test_id'
                        }
                    }
                };
            }

            static get tableName() {
                return db;
            }
        };
        app.orm.RelTest = class RelTest extends app.orm.$Model {
            static get softDelete() {
                return (opts.softDelete === true);
            }
            static get jsonSchema() {
                let schema = null;
                if (opts.schema === 1) {
                    schema = {
                        title: 'Test Related Schema',
                        type: 'object',
                        properties: {
                            id: {type: 'integer'},
                            test_id: {type: 'integer'},
                            desc: {type: 'string', minLength: 1, maxLength: 255}
                        }
                    };
                }
                return schema;
            }
            static get relationMappings() {
                return {
                    tests: {
                        relation: app.orm.$Model.BelongsToOneRelation,
                        modelClass: app.orm.Test,
                        join: {
                            from: 'related-' + db + '.test_id',
                            to: db + '.id'
                        }
                    }
                };
            }

            static get tableName() {
                return 'related-' + db;
            }
        };
    });
}