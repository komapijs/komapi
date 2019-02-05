// Imports
import Komapi from './Komapi';

// Exports
class Service<Application extends Komapi = Komapi> {
  public app: Application;

  /**
   * Create service
   * @param {Application} app
   */
  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Initialization
   */
  public async init(app: Application) {}

  /**
   * Graceful shutdown
   */
  public async close(app: Application) {}
}

// Exports
export default Service;
