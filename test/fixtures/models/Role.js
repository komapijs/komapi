// Dependencies
import { Model } from 'objection'; // eslint-disable-line
import User from './User';
import Permission from './Permission';

// Exports
export default class Role extends Model {
  static get tableName() { return 'roles'; }
  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'roles.id',
          through: {
            from: 'roles_users.role_id',
            to: 'roles_users.user_id',
          },
          to: 'users.id',
        },
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: Permission,
        join: {
          from: 'roles.id',
          through: {
            from: 'permissions_roles.role_id',
            to: 'permissions_roles.permission_id',
          },
          to: 'permissions.id',
        },
      },
    };
  }
}
