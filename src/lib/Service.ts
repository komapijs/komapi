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
  public async start(app: Application) {}

  /**
   * Graceful shutdown
   */
  public async stop(app: Application) {}
}

// Exports
export default Service;
