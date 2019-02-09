// Imports
import { getNamespace } from 'cls-hooked';
import Komapi from '../../../../src/lib/Komapi';

// Tests
it('should trigger `app.start()` before running the code', async done => {
  expect.assertions(5);
  const app = new Komapi();
  const startSpy = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
  const orgStart = app.start.bind(app);
  app.start = jest.fn(() => orgStart());

  // Add slow start handler to ensure start lifecycle handler is actually invoked and done
  app.onStart(startSpy);

  // Assert initial state
  expect(app.state).toBe('STOPPED');

  // Run async code
  await app.run(async () => {
    expect(app.state).toBe('STARTED');
  });

  // Assertions
  expect(app.start).toBeCalledTimes(1);
  expect(app.state).toBe('STARTED');
  expect(startSpy).toBeCalledTimes(1);

  // Done with testing
  done();
});
it('should preserve the transaction context', async done => {
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
