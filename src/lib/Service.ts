// Imports
import Komapi from './Komapi';

// Exports
class Service {
  public app: Komapi;

  /**
   * Create service
   * @param {Application} app
   */
  constructor(app: Komapi) {
    this.app = app;
  }

  /**
   * Initialization
   */
  public async init(app: Komapi) {}

  /**
   * Graceful shutdown
   */
  public async close(app: Komapi) {}
}

// Exports
export default Service;
