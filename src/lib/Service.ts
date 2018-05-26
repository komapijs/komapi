// Dependencies
import Application from './Komapi';

/**
 * Class
 */
class Service {
  public app: Application;

  /**
   * Create service
   * @param {Komapi} app
   */
  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Initiate service with asynchronous actions
   *
   * @returns {Promise<this>}
   */
  public async init(): Promise<this> {
    return this;
  }
}

// Exports
export = Service;
