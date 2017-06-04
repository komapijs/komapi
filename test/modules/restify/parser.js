// Dependencies
import test from 'ava';
import { Model } from 'objection';
import Parser from '../../../src/modules/restify/parser';

// Init
const unboundModels = {};
unboundModels.Min = class Min extends Model {
  static get tableName() { return 'min'; }
};
unboundModels.User = class User extends Model {
  static get tableName() { return 'users'; }
  static relationMappings() {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: unboundModels.Role,
        join: {
          from: 'users.id',
          through: {
            from: 'roles_users.user_id',
            to: 'roles_users.role_id',
          },
          to: 'roles.id',
        },
      },
    };
  }
  static get jsonSchema() {
    return {
      $schema: 'http://json-schema.org/draft-04/schema#',
      title: 'Schema definition',
      required: [
        'username',
      ],
      type: 'object',
      properties: {
        username: {
          description: 'Username',
          type: 'string',
        },
      },
    };
  }
};
unboundModels.Role = class Role extends Model {
  static get tableName() { return 'roles'; }
  static relationMappings() {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: unboundModels.User,
        join: {
          from: 'roles.id',
          through: {
            from: 'roles_users.role_id',
            to: 'roles_users.user_id',
          },
          to: 'users.id',
        },
      },
    };
  }
};

// Tests
test('loads options from an Objection model by default', async (t) => {
  const parser = new Parser(unboundModels.User);
  const properties = {
    $filter: Parser.$defaultSchema.properties.$filter,
    $sort: {
      description: 'Sort the result set',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          '+id',
          '-id',
          '+username',
          '-username',
        ],
      },
      uniqueItems: true,
    },
    $skip: Parser.$defaultSchema.properties.$skip,
    $top: Parser.$defaultSchema.properties.$top,
    $expand: {
      description: 'Expand related objects',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'roles',
        ],
      },
      uniqueItems: true,
    },
    $select: {
      description: 'Limit returned attributes to these attributes',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'id',
          'username',
        ],
      },
      uniqueItems: true,
    },
    $count: Parser.$defaultSchema.properties.$count,
  };
  t.deepEqual(parser.$schema.properties, properties);
});
test('supports minimal models', async (t) => {
  const parser = new Parser(unboundModels.Min);
  const properties = {
    $filter: Parser.$defaultSchema.properties.$filter,
    $sort: Parser.$defaultSchema.properties.$sort,
    $skip: Parser.$defaultSchema.properties.$skip,
    $top: Parser.$defaultSchema.properties.$top,
    $expand: Parser.$defaultSchema.properties.$expand,
    $select: Parser.$defaultSchema.properties.$select,
    $count: Parser.$defaultSchema.properties.$count,
  };
  t.deepEqual(parser.$schema.properties, properties);
});
test('can manually override options', async (t) => {
  const customSchema = Parser.$defaultSchema;
  delete customSchema.properties.$filter;
  const parser = new Parser(unboundModels.User, {
    querySchema: customSchema,
    $select: ['firstname', 'lastname'],
    $sort: ['created_at', 'company'],
    $expand: ['friends', 'cars'],
  });
  const properties = {
    $sort: {
      description: 'Sort the result set',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          '+created_at',
          '-created_at',
          '+company',
          '-company',
        ],
      },
      uniqueItems: true,
    },
    $skip: Parser.$defaultSchema.properties.$skip,
    $top: Parser.$defaultSchema.properties.$top,
    $expand: {
      description: 'Expand related objects',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'friends',
          'cars',
        ],
      },
      uniqueItems: true,
    },
    $select: {
      description: 'Limit returned attributes to these attributes',
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'firstname',
          'lastname',
        ],
      },
      uniqueItems: true,
    },
    $count: Parser.$defaultSchema.properties.$count,
  };
  t.deepEqual(parser.$schema.properties, properties);
});
test('parses a simple query to a standard format', async (t) => {
  const parser = new Parser(unboundModels.User);
  const parseOutput = parser.parse({
    $select: 'username',
    $expand: 'roles',
  });
  t.deepEqual(parseOutput, {
    filter: undefined,
    sort: undefined,
    offset: undefined,
    limit: 10,
    expand: ['roles'],
    expandSelect: {},
    select: ['username'],
    count: false,
  });
});
test('parses a complex query to a standard format', async (t) => {
  const parser = new Parser(unboundModels.User);
  const parseOutput = parser.parse({
    $select: 'username',
    '$select[roles]': 'role_id',
    $expand: 'roles',
    $sort: '-username',
    $count: 'true',
  });
  t.deepEqual(parseOutput, {
    filter: undefined,
    sort: ['-username'],
    offset: undefined,
    limit: 10,
    expand: ['roles'],
    expandSelect: {
      roles: ['role_id'],
    },
    select: ['username'],
    count: true,
  });
});
test('parses a blank queries', async (t) => {
  const parser = new Parser(unboundModels.User);
  const expected = {
    filter: undefined,
    sort: undefined,
    offset: undefined,
    limit: 10,
    expand: undefined,
    expandSelect: null,
    select: undefined,
    count: false,
  };
  const parseOutput = parser.parse({});
  const parseOutput2 = parser.parse();
  t.deepEqual(parseOutput, expected);
  t.deepEqual(parseOutput2, expected);
});
test('throws on invalid query', async (t) => {
  const parser = new Parser(unboundModels.User);
  t.throws(() => {
    parser.parse({
      $select: 'invalidField',
    });
  }, 'Invalid query parameters');
});
