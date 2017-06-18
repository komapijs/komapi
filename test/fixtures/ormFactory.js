// Dependencies
import knex from 'knex';
import { Model } from 'objection'; // eslint-disable-line

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
  return Promise.all([
    knexInstance.schema.createTable(db, (table) => {
      table.increments('id').primary();
      table.string('name');
      table.integer('num');
    }),
    knexInstance.schema.createTable(`related-${db}`, (table) => {
      table.increments('id').primary();
      table.integer('test_id');
      table.string('desc');
    }),
    knexInstance.schema.createTable(`related2-${db}`, (table) => {
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
        knexInstance.batchInsert(db, rows),
        knexInstance.batchInsert(`related-${db}`, relRows),
        knexInstance.batchInsert(`related2-${db}`, relRows2),
      ]);
    }
    return null;
  }).then(() => {
    const unboundModels = {};
    unboundModels.Test = class Test extends Model { // eslint-disable-line no-param-reassign
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
      static relationMappings() {
        return {
          reltests: {
            relation: Model.HasManyRelation,
            modelClass: unboundModels.RelTest,
            join: {
              from: `${db}.id`,
              to: `related-${db}.test_id`,
            },
          },
          reltests2: {
            relation: Model.HasManyRelation,
            modelClass: unboundModels.RelTest2,
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
    unboundModels.RelTest = class RelTest extends Model { // eslint-disable-line no-param-reassign
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
      static relationMappings() {
        return {
          test: {
            relation: Model.BelongsToOneRelation,
            modelClass: unboundModels.Test,
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
    unboundModels.RelTest2 = class RelTest2 extends Model { // eslint-disable-line no-param-reassign
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
      static relationMappings() {
        return {
          test: {
            relation: Model.BelongsToOneRelation,
            modelClass: unboundModels.Test,
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
    app.orm.Test = unboundModels.Test.bindKnex(knexInstance); // eslint-disable-line
    app.orm.RelTest = unboundModels.RelTest.bindKnex(knexInstance); // eslint-disable-line
    app.orm.RelTest2 = unboundModels.RelTest2.bindKnex(knexInstance); // eslint-disable-line
  });
}
