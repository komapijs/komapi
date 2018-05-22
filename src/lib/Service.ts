// Dependencies
import Komapi from './Komapi';

/**
 * Class
 */
class Service {
  public app: Komapi;

  /**
   * Create service
   * @param {Komapi} app
   */
  constructor(app: Komapi) {
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
