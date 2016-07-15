'use strict';

// Exports
module.exports = (orm) => {
    return class User extends orm.$Model {
        static get tableName() { return 'users'; }
        static get relationMappings() {
            return {
                roles: {
                    relation: orm.$Model.ManyToManyRelation,
                    modelClass: orm.Role,
                    join: {
                        from: 'User.id',
                        through: {
                            from: 'roles_users.user_id',
                            to: 'roles_users.role_id'
                        },
                        to: 'Role.id'
                    }
                }
            };
        }
        static jsonSchema() {
            return {
                $schema: 'http://json-schema.org/draft-04/schema#',
                title: 'Schema definition',
                required: [
                    'username'
                ],
                type: 'object',
                properties: {
                    username: {
                        description: 'Username',
                        type: 'string'
                    }
                }
            };
        }
    };
};