// Imports
import cls from 'cls-hooked';
import createLogger from '../../../src/lib/createLogger';
import WritableStreamSpy from '../../fixtures/WritableStreamSpy';


// Tests
it('should create a Pino compatible logger', () => {
  const ns = cls.createNamespace('my-logging-namespace');
  const logger = createLogger(ns, {}, new WritableStreamSpy());

  // Assertions
  expect(typeof logger.trace).toBe('function');
  expect(typeof logger.debug).toBe('function');
  expect(typeof logger.info).toBe('function');
  expect(typeof logger.warn).toBe('function');
  expect(typeof logger.error).toBe('function');
  expect(typeof logger.fatal).toBe('function');
  expect(typeof logger.child).toBe('function');
});
it('should work without additional data', () => {
  const ns = cls.createNamespace('my-basic-logging-namespace');
  const spy = jest.fn();
  const logger = createLogger(ns, {}, new WritableStreamSpy(spy));

  // Log something
  logger.info('my logtext');

  // Assertions
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":30'));
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"my logtext"'));
});
it('should work with additional data', () => {
  const ns = cls.createNamespace('my-basic-logging-namespace');
  const spy = jest.fn();
  const logger = createLogger(ns, {}, new WritableStreamSpy(spy));

  // Log something
  logger.info({ myKey: 1, myOtherKey: 'withString' }, 'my logtext');

  // Assertions
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":30'));
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"my logtext"'));
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('"myKey":1,"myOtherKey":"withString"'));
});
it('should include all context variables', async done => {
  expect.assertions(4);
  const ns = cls.createNamespace('my-logging-namespace2');
  const spy = jest.fn();
  const logger = createLogger(ns, {}, new WritableStreamSpy(spy));

  // Run in context
  ns.run(() => {
    ns.set('key1', 'value1');
    ns.set('key2', 'value2');
    logger.info('my logtext');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":30'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"my logtext"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"context":{"key1":"value1","key2":"value2"}'));
  });

  // Done
  done();
});
it('should support child loggers with all context variables from parent', async done => {
  expect.assertions(5);
  const ns = cls.createNamespace('my-logging-namespace3');
  const spy = jest.fn();
  const logger = createLogger(ns, {}, new WritableStreamSpy(spy));

  // Run in context
  ns.run(() => {
    ns.set('key1', 'value1');
    ns.set('key2', 'value2');
    const childLogger = logger.child({ isChild: true });
    ns.set('key3', 'value3');
    childLogger.info('my logtext');

    // Assertions
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":30'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"msg":"my logtext"'));
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('"context":{"key1":"value1","key2":"value2","key3":"value3"}'),
    );
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"isChild":true'));
  });

  // Done
  done();
});
