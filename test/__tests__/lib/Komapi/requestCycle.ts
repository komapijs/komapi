// Imports
import request from 'supertest';
import Komapi from '../../../fixtures/Komapi';

// Tests
it('should preserve current request transaction context in `app.transactionContext`', () => {
  expect.assertions(2);
  const app = new Komapi();

  // Add middlewares
  app.use((ctx, next) => {
    ctx.app.transactionContext.set('property1', 'value1');
    return next();
  });
  app.use((ctx, next) => {
    expect(ctx.app.transactionContext.get('property1')).toBe('value1');
    ctx.app.transactionContext.set('property1', 'value2');
    return next();
  });
  app.use((ctx, next) => {
    expect(ctx.app.transactionContext.get('property1')).toBe('value2');
    return next();
  });

  return request(app.callback()).get('/');
});
