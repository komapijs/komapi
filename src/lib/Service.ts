// Imports
import Komapi from './Komapi';

// Types
interface Service<Application extends Komapi = Komapi<any, any, any>> {

}

// Exports
class Service<Application extends Komapi = Komapi<any, any, any>> {
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
  public async start?(app: Application): Promise<any>

  /**
   * Graceful shutdown
   */
  public async stop?(app: Application): Promise<any>
}

// Exports
export default Service;
