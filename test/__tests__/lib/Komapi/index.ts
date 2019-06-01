// Imports
import { VError } from 'botched';
import Komapi from '../../../fixtures/Komapi';
import Account from '../../../fixtures/services/Account';
import Chat from '../../../fixtures/services/Chat';
import WritableStreamSpy from '../../../fixtures/WritableStreamSpy';

// Tests
describe('instantiation', () => {
  it('should use sane defaults', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    const app = new Komapi();

    // Assertions
    expect(app.env).toBe('development');
    expect(app.proxy).toBe(false);
    expect(app.subdomainOffset).toBe(2);
    expect(app.silent).toBe(undefined);
    expect(app.keys).toBe(undefined);
    expect(app.log.level).toBe('info');
    expect(app.services).toEqual({});

    // Cleanup
    process.env.LOG_LEVEL = originalLogLevel;
    process.env.NODE_ENV = originalEnv;
  });
  it('should use default environment variables', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    const originalEnv = process.env.NODE_ENV;
    process.env.LOG_LEVEL = 'trace';
    process.env.NODE_ENV = 'production';
    const app = new Komapi();

    // Assertions
    expect(app.env).toBe('production');
    expect(app.log.level).toBe('trace');

    // Cleanup
    process.env.LOG_LEVEL = originalLogLevel;
    process.env.NODE_ENV = originalEnv;
  });
  it('should use heroku environment variables if present', () => {
    process.env.HEROKU_DYNO_ID = 'HEROKU_DYNO_ID';
    const app = new Komapi();

    // Assertions
    expect(app.config.instanceId).toBe('HEROKU_DYNO_ID');

    // Cleanup
    delete process.env.HEROKU_DYNO_ID;
  });
  it('should be configurable', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    const app = new Komapi({
      config: {
        env: 'my-env',
        proxy: true,
        subdomainOffset: 3,
        silent: true,
        keys: ['asd'],
        instanceId: 'my-instance-id',
        // errorHandler: false,
        // requestLogger: false,
        // healthReporter: false,
      },
      logOptions: {
        level: 'error',
        redact: {
          paths: ['request.header.authorization', 'request.header.cookie'],
          censor: '[REDACTED]',
        },
      },
    });

    // Assertions
    expect(app.env).toBe('my-env');
    expect(app.proxy).toBe(true);
    expect(app.subdomainOffset).toBe(3);
    expect(app.silent).toBe(true);
    expect(app.keys).toEqual(['asd']);
    expect(app.config.instanceId).toBe('my-instance-id');
    expect(app.log.level).toBe('error');
    expect(app.services).toEqual({});

    // Cleanup
    process.env.LOG_LEVEL = originalLogLevel;
    process.env.NODE_ENV = originalEnv;
  });
  it('should integrate with koa', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const app = new Komapi();

    // Assertions
    expect(app.env).toBe('development');
    expect(app.proxy).toBe(false);
    expect(app.subdomainOffset).toBe(2);
    expect(app.silent).toBe(undefined);
    expect(app.keys).toBe(undefined);
    expect(app.env).toBe(app.config.env);
    expect(app.proxy).toBe(app.config.proxy);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.silent).toBe(app.config.silent);
    expect(app.keys).toBe(app.config.keys);

    app.env = 'production';
    app.proxy = true;
    app.subdomainOffset = 3;
    app.silent = false;
    app.keys = ['my-key'];

    expect(app.config.env).toBe('production');
    expect(app.config.proxy).toBe(true);
    expect(app.subdomainOffset).toBe(3);
    expect(app.silent).toBe(false);
    expect(app.keys).toEqual(['my-key']);
    expect(app.env).toBe(app.config.env);
    expect(app.proxy).toBe(app.config.proxy);
    expect(app.subdomainOffset).toBe(app.config.subdomainOffset);
    expect(app.silent).toBe(app.config.silent);
    expect(app.keys).toBe(app.config.keys);

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
  it('should instantiate services', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const app = new Komapi({
      services: {
        Account,
      },
    });

    // Assertions
    expect(app.services.Account instanceof Account).toBe(true);
    expect(app.services.Account.app).toBe(app);

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
  it('should start in STOPPED state', () => {
    const app = new Komapi();

    // Assertions
    expect(app.state).toBe('STOPPED');
  });
  it('should add service lifecycle handlers automatically', async done => {
    expect.assertions(5);
    const services = {
      Account,
      Chat,
    };
    let counter = 0;
    const accountStartSpy = jest.fn(async () => {
      expect(counter).toBe(0);
      counter += 1;
    });
    const accountStopSpy = jest.fn(async () => {
      expect(counter).toBe(3);
      counter += 1;
    });
    const chatStartSpy = jest.fn(async () => {
      expect(counter).toBe(1);
      counter += 1;
    });
    const chatStopSpy = jest.fn(async () => {
      expect(counter).toBe(2);
      counter += 1;
    });

    // Add spies
    services.Account.prototype.start = accountStartSpy;
    services.Account.prototype.stop = accountStopSpy;
    services.Chat.prototype.start = chatStartSpy;
    services.Chat.prototype.stop = chatStopSpy;

    const app = new Komapi<{}, {}, typeof services>({ services });

    // Assertions
    expect(app.lifecycleHandlers).toHaveLength(2);

    // Run application
    await app.start();
    await app.stop();

    // Done
    done();
  });
});
describe('app.log', () => {
  it('should have sane defaults', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const spy = jest.fn();
    const app = new Komapi({ logStream: new WritableStreamSpy(spy) });

    // Log something
    app.log[app.log.level]('My custom log message');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"My custom log message"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"pid":'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"hostname":"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"env":"development"'));

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
  it('should log custom environment', () => {
    const spy = jest.fn();
    const app = new Komapi({ config: { env: 'production' }, logStream: new WritableStreamSpy(spy) });

    // Log something
    app.log[app.log.level]('My custom log message');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"My custom log message"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"env":"production"'));
  });
  it('should serialize errors', () => {
    const spy = jest.fn();
    const app = new Komapi({ logStream: new WritableStreamSpy(spy) });

    // Create multi error
    const err = new Error('My Error');

    // Log the error
    app.log[app.log.level]({ err }, 'My custom error log message');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"My custom error log message"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"err":{"type":"Error","message":"My Error","stack":"'));
  });
  it('should serialize multi errors', () => {
    const spy = jest.fn();
    const app = new Komapi({ logStream: new WritableStreamSpy(spy) });

    // Create multi error
    const err = new VError.MultiError([new Error('My First Error'), new Error('My Second Error')]);

    // Log the error
    app.log[app.log.level]({ err }, 'My custom error log message');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"My custom error log message"'));
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"err":{"type":"MultiError","message":"first of 2 errors: My First Error","stack":"'),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"errors":[{"type":"Error","message":"My First Error","stack":'),
    );
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('{"type":"Error","message":"My Second Error","stack":'));
  });
});
describe('app.middleware', () => {
  it('should have default middlewares', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware).toHaveLength(4);
  });
  it('should have transactionContext as the first middleware', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware[0].name).toBe('setTransactionContextMiddleware');
  });
  it('should have requestLogger as the second middleware', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware[1].name).toBe('requestLoggerMiddleware');
  });
  it('should have errorHandler as the third middleware', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware[2].name).toBe('errorHandlerMiddleware');
  });
  it('should have ensureStarted as the fourth middleware', () => {
    const app = new Komapi();

    // Assertions
    expect(app.middleware[3].name).toBe('ensureStartedMiddleware');
  });
});
describe('app.listen', () => {
  it('should add trigger start lifecycle method', async done => {
    expect.assertions(1);
    const app = new Komapi();
    app.start = jest.fn();

    // Listen
    const server = app.listen();

    // Check handler was called
    expect(app.start).toHaveBeenCalledTimes(1);

    // Done
    await new Promise(resolve => server.close(resolve));
    done();
  });
  it('should add lifecycle stop handler to close the http server', async done => {
    expect.assertions(4);
    const app = new Komapi();
    const closeSpy = jest.fn();

    // Ensure known initial state
    expect(app.lifecycleHandlers).toHaveLength(0);

    // Listen
    const server = app.listen();
    server.on('close', closeSpy);

    // Check handler was added
    expect(app.lifecycleHandlers).toHaveLength(1);
    expect(closeSpy).not.toBeCalled();

    // Stop server
    await app.stop();

    // Check handler was called
    expect(closeSpy).toHaveBeenCalledTimes(1);

    // Done
    done();
  });
  it('should work if stopped multiple times', async done => {
    expect.assertions(4);
    const app = new Komapi();
    const closeSpy = jest.fn();

    // Ensure known initial state
    expect(app.lifecycleHandlers).toHaveLength(0);

    // Listen
    const server = app.listen();
    server.on('close', closeSpy);

    // Check handler was added
    expect(app.lifecycleHandlers).toHaveLength(1);
    expect(closeSpy).not.toBeCalled();

    // Stop and restart server
    await app.stop();
    await app.start();

    // Check that stopping still works
    await app.stop();

    // Check handler was called
    expect(closeSpy).toHaveBeenCalledTimes(2);

    // Done
    done();
  });
});
