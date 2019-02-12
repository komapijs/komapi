// Imports
import Komapi from '../../src/lib/Komapi';

// Test Setup
afterEach(() => {
  [
    'warning',
    'SIGTERM',
    'SIGINT',
    'SIGHUP',
    'uncaughtException',
    'unhandledRejection',
    'multipleResolves',
    'beforeExit',
  ].forEach(event => process.removeAllListeners(event));
});

// Exports
export default Komapi;
