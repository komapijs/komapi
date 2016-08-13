'use strict';

// Dependencies
import Service from '../../../src/modules/service/service';

// Exports
module.exports = class UserService extends Service {
    get $routes() {
        let routes = super.$routes;
        routes.find = {
            enable: !!this.find,
            method: 'GET',
            route: '/find/:id',
            handler: (ctx) => Promise.resolve(this.find(ctx.params.id)).then(ctx.send)
        };
        routes.findWithHooks = {
            enable: !!this.findWithHooks,
            method: 'GET',
            route: '/findWithHooks/:id',
            handler: (ctx) => this.findWithHooks(ctx.params.id).then(ctx.send)
        };
        routes.invalidRoute = {
            enable: !!this.invalidRoute,
            method: 'GET',
            route: '/invalidRoute/:id',
            handler: (ctx) => this.findWithHooks(ctx.params.id).then(ctx.send)
        };
        return routes;
    }
    $setup() {
        super.$setup();
        this.$hooks('findWithHooks', [
            (args, next) => {
                args.id = parseInt(args.id, 10);
                args.id = args.id + 1;
                return next();
            },
            (args, next) => {
                args.id = args.id + 1;
                return next();
            }
        ]);
        this.$hooks('invalidOperation', [
            (args, next) =>  next()
        ]);
    }
    find(id) {
        return id;
    }
    findWithHooks(id) {
        return id;
    }
};