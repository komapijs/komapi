'use strict';

// Exports
module.exports = (app) => {
    return app.orm.Model.extend({
        tableName: 'users',
        hasTimestamps: true,
        roles: function () {
            return this.belongsToMany('Role', 'roles_users');
        },
        permissions: function () {
            return this.belongsToMany('Permission').through('Role');
        }
    });
};