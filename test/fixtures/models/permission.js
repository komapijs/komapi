'use strict';

// Exports
module.exports = (app) => {
    return app.orm.Model.extend({
        tableName: 'permissions',
        hasTimestamps: true,
        roles: function() {
            return this.belongsToMany('Role', 'permissions_roles');
        }
    });
};
