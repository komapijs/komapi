// Dependencies
import sanitize from '../../../src/lib/sanitize';

// Tests
it('should support null values', () => {
  const dirty = undefined;
  const clean = sanitize(dirty);
  expect(clean).toBe(dirty);
});
it('should not fail on string values', () => {
  const dirty = JSON.stringify({
    name: 'George',
    token: 'secret token',
    password: 'a super secret password',
    email: 'george@example.com',
    'credit-card': '1234-5678-9101-1121',
    creditCard: '1234-5678-9101-1121',
    secret: 'a secret',
    room: '220',
  });
  const clean = sanitize(dirty);
  expect(clean).toEqual(dirty);
});
it('should not hide insensitive data', () => {
  const dirty = {
    name: 'George',
    email: 'george@example.com',
    room: '220',
  };
  const expectedClean = {
    name: 'George',
    email: 'george@example.com',
    room: '220',
  };
  const clean = sanitize(dirty);
  expect(clean).toEqual(expectedClean);
});
it('should hide sensitive data', () => {
  const safeValue = '[REDACTED]';
  const dirty = {
    name: 'George',
    token: 'secret token',
    password: 'a super secret password',
    email: 'george@example.com',
    'credit-card': '1234-5678-9101-1121',
    creditCard: '1234-5678-9101-1121',
    secret: 'a secret',
    room: '220',
  };
  const expectedClean = {
    name: 'George',
    token: safeValue,
    password: safeValue,
    email: 'george@example.com',
    'credit-card': safeValue,
    creditCard: safeValue,
    secret: safeValue,
    room: '220',
  };
  const clean = sanitize(dirty);
  expect(clean).toEqual(expectedClean);
  expect(dirty).toEqual({
    name: 'George',
    token: 'secret token',
    password: 'a super secret password',
    email: 'george@example.com',
    'credit-card': '1234-5678-9101-1121',
    creditCard: '1234-5678-9101-1121',
    secret: 'a secret',
    room: '220',
  });
});
