// Imports
import Komapi from './Komapi';

// Types
interface Service<Application extends Komapi = Komapi<any, any, Komapi.CustomOptions>> {}

// Exports
class Service<Application extends Komapi = Komapi<any, any, Komapi.CustomOptions>> {
  public app: Application;

  /**
   * Create service and automatically register start and stop lifecycle handlers
   * @param {Application} app
   */
  public constructor(app: Application) {
    this.app = app;

    // Automatically add service lifecycle handlers
    if (this.start || this.stop) {
      app.addLifecycleHandler({
        name: `service:${this.constructor.name}`,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        start: (this.start && ((...args) => this.start!(...args))) || undefined,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        stop: (this.stop && ((...args) => this.stop!(...args))) || undefined,
      });
    }
  }

  /**
   * Service start lifecycle handler
   */
  public async start?(app: Application): Promise<any>;

  /**
   * Service stop lifecycle handler
   */
  public async stop?(app: Application): Promise<any>;
}

// Exports
export default Service;
