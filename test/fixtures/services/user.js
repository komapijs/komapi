// Dependencies
import Service from '../../../src/modules/service/service';

// Exports
module.exports = class UserService extends Service {
  $setup(...args) {
    super.$setup(...args);
    this.$hooks('getWithHooks', (resArgs, next) => next().then(res => res + 2));
    this.$hooks('getUnknownWithHooks', (resArgs, next) => next().then(res => res + 2));
  }
  getWithHooks(id) { // eslint-disable-line class-methods-use-this
    return id;
  }
  get(id) { // eslint-disable-line class-methods-use-this
    return id;
  }
  $getRoutes(...args) {
    const router = super.$getRoutes(...args);
    router.get('/:id', ctx => ctx.send(this.get(ctx.params.id)));
    return router;
  }
};
