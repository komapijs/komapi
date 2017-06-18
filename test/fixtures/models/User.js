// Dependencies
import { Model } from 'objection'; // eslint-disable-line
import Role from './Role';

// Exports
export default class User extends Model {
  static get tableName() { return 'users'; }
  static get relationMappings() {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: Role,
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
}
