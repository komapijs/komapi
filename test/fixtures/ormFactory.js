// Dependencies
import knex from 'knex';

// Init
let counter = 0;
const knexInstance = knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: ':memory:',
  },
  migrations: {
    directory: `${__dirname}/migrations`,
    tableName: 'migrations',
  },
});
knexInstance.setMaxListeners(30);

// Exports
export default function ormFactory(app, opts = {}) {
  counter += 1;
  const db = opts.db || `test${counter}`;
  delete require.cache[require.resolve('objection')];
  app.knex(knexInstance);
  return Promise.all([
    app.orm.$Model.knex().schema.createTable(db, (table) => {
      table.increments('id').primary();
      table.string('name');
      table.integer('num');
    }),
    app.orm.$Model.knex().schema.createTable(`related-${db}`, (table) => {
      table.increments('id').primary();
      table.integer('test_id');
      table.string('desc');
    }),
    app.orm.$Model.knex().schema.createTable(`related2-${db}`, (table) => {
      table.increments('id').primary();
      table.integer('test_id');
      table.string('desc');
    }),
  ]).then(() => {
    if (opts.seed) {
      const rows = [];
      const relRows = [];
      const relRows2 = [];
      for (let i = 1; i <= opts.seed; i += 1) {
        const row = {
          name: `name-${i}`,
          num: i,
        };
        rows.push(row);
        relRows.push({
          test_id: i,
          desc: `rel-name-${i}-1`,
        });
        relRows.push({
          test_id: i,
          desc: `rel-name-${i}-2`,
        });
        relRows2.push({
          test_id: i,
          desc: `rel2-name-${i}-1`,
        });
        relRows2.push({
          test_id: i,
          desc: `rel2-name-${i}-2`,
        });
      }
      return Promise.all([
        app.orm.$Model.knex().batchInsert(db, rows),
        app.orm.$Model.knex().batchInsert(`related-${db}`, relRows),
        app.orm.$Model.knex().batchInsert(`related2-${db}`, relRows2),
      ]);
    }
    return null;
  }).then(() => {
    app.orm.Test = class Test extends app.orm.$Model { // eslint-disable-line no-param-reassign
      static get jsonSchema() {
        let schema = null;
        if (opts.schema === 1) {
          schema = {
            title: 'Test Schema',
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 255 },
              num: { type: 'number' },
            },
          };
        } else if (opts.schema && typeof opts.schema === 'object') schema = opts.schema;
        return schema;
      }
      static get relationMappings() {
        return {
          reltests: {
            relation: app.orm.$Model.HasManyRelation,
            modelClass: app.orm.RelTest,
            join: {
              from: `${db}.id`,
              to: `related-${db}.test_id`,
            },
          },
          reltests2: {
            relation: app.orm.$Model.HasManyRelation,
            modelClass: app.orm.RelTest2,
            join: {
              from: `${db}.id`,
              to: `related2-${db}.test_id`,
            },
          },
        };
      }
      static get tableName() {
        return db;
      }
    };
    app.orm.RelTest = class RelTest extends app.orm.$Model { // eslint-disable-line no-param-reassign
      static get jsonSchema() {
        let schema = null;
        if (opts.schema === 1) {
          schema = {
            title: 'Test Related Schema',
            type: 'object',
            properties: {
              test_id: { type: 'integer' },
              desc: { type: 'string', minLength: 1, maxLength: 255 },
            },
          };
        } else if (opts.schema && typeof opts.schema === 'object') schema = opts.schema;
        return schema;
      }
      static get relationMappings() {
        return {
          test: {
            relation: app.orm.$Model.BelongsToOneRelation,
            modelClass: app.orm.Test,
            join: {
              from: `related-${db}.test_id`,
              to: `${db}.id`,
            },
          },
        };
      }
      static get tableName() {
        return `related-${db}`;
      }
    };
    app.orm.RelTest2 = class RelTest2 extends app.orm.$Model { // eslint-disable-line no-param-reassign
      static get jsonSchema() {
        let schema = null;
        if (opts.schema === 1) {
          schema = {
            title: 'Test Related Schema',
            type: 'object',
            properties: {
              test_id: { type: 'integer' },
              desc: { type: 'string', minLength: 1, maxLength: 255 },
            },
          };
        } else if (opts.schema && typeof opts.schema === 'object') schema = opts.schema;
        return schema;
      }
      static get relationMappings() {
        return {
          test: {
            relation: app.orm.$Model.BelongsToOneRelation,
            modelClass: app.orm.Test,
            join: {
              from: `related2-${db}.test_id`,
              to: `${db}.id`,
            },
          },
        };
      }
      static get tableName() {
        return `related2-${db}`;
      }
    };
  });
}
