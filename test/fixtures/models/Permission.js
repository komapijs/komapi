// Dependencies
import { Model } from 'objection'; // eslint-disable-line
import Role from './Role';

// Exports
export default class Permission extends Model {
  static get tableName() { return 'permissions'; }
  static get relationMappings() {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: 'permissions.id',
          through: {
            from: 'permissions_roles.permission_id',
            to: 'permissions_roles.role_id',
          },
          to: 'roles.id',
        },
      },
    };
  }
}
