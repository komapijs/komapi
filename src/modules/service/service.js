// Dependencies
import Router from 'koa-router';

// Exports
export default class Service {

  /**
   * Initiate the service
   * @final
   * @param Komapi app Application instance
   */
  constructor(app) {
    this.app = app;
    this.hooks = {};
  }

  /**
   * Bootstrapping code here
   */
  $setup() {} // eslint-disable-line class-methods-use-this

  /**
   * Set or get hooks
   * @param {String=} method The method to get or set hooks for
   * @param {Array|Object=} hooks An array or object containing all hooks
   */
  $hooks(method, hooks) {
    if (method && hooks) this.hooks[method] = this.$hooks(method).concat(hooks);
    else if (!method && hooks) {
      Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((k) => {
        if (['$', '_'].indexOf(k[0]) === -1 && k !== 'constructor') this.hooks[k] = this.$hooks(k).concat(hooks);
      });
    }
    if (!method) return this.hooks;
    return this.hooks[method] || [];
  }

  /**
   * Helper function for automatically registering routes
   * @param {Router=} router Router instance to use
   * @returns {Router}
   */
  $getRoutes(router) {  // eslint-disable-line class-methods-use-this
    return router || new Router();
  }
}
