// Imports
import { getNamespace } from 'cls-hooked';
import Komapi from '../../../../src/lib/Komapi';

// Tests
it('should provide `app.run()` to run code within a transaction context', async done => {
  expect.assertions(3);
  const instanceId = 'test-komapi-transaction-context';
  const app = new Komapi({
    config: {
      instanceId,
    },
  });

  // Function for logging transaction context.
  async function logTransactionContext() {
    // Using built in functionality
    expect(app.transactionContext.get('Foo')).toBe('My Value');

    // Using the namespaces natively
    const transactionContext = getNamespace(instanceId);

    // Check that we receive the same context
    expect(transactionContext).toBe(app.transactionContext);
    expect(transactionContext.get('Foo')).toBe('My Value');
  }

  // Run async code with transaction context
  app.run(async () => {
    // Set transaction context
    app.transactionContext.set('Foo', 'My Value');

    // Run my function
    await logTransactionContext();

    // Done with testing
    done();
  });
});
