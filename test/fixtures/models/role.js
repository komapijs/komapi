'use strict';

// Exports
module.exports = (orm) => {
    return class Role extends orm.$Model {
        static get tableName() { return 'roles'; }
        static get relationMappings() {
            return {
                roles: {
                    relation: orm.$Model.ManyToManyRelation,
                    modelClass: orm.User,
                    join: {
                        from: 'Role.id',
                        through: {
                            from: 'roles_users.role_id',
                            to: 'roles_users.user_id'
                        },
                        to: 'User.id'
                    }
                },
                permissions: {
                    relation: orm.$Model.ManyToManyRelation,
                    modelClass: orm.Permission,
                    join: {
                        from: 'Role.id',
                        through: {
                            from: 'permissions_roles.role_id',
                            to: 'permissions_roles.permission_id'
                        },
                        to: 'Permission.id'
                    }
                }
            };
        }
    };
};