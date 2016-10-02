// Exports
module.exports = orm => class Permission extends orm.$Model {
    static get tableName() { return 'permissions'; }
    static get relationMappings() {
        return {
            roles: {
                relation: orm.$Model.ManyToManyRelation,
                modelClass: orm.Role,
                join: {
                    from: 'Permission.id',
                    through: {
                        from: 'permissions_roles.permission_id',
                        to: 'permissions_roles.role_id',
                    },
                    to: 'Role.id',
                },
            },
        };
    }
};
