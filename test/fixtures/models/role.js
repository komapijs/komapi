'use strict';

// Exports
module.exports = (app) => {
    return app.orm.Model.extend({
        tableName: 'roles',
        hasTimestamps: true,
        users: function () {
            return this.belongsToMany('User', 'roles_users');
        },
        permissions: function () {
            return this.belongsToMany('Permission', 'permissions_roles');
        }
    });
};