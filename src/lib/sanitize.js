/**
 * Cleanse an object for any sensitive information
 *
 * @param {Object} dirty - An object containing sensitive information
 * @returns {Object}
 */
export default function sanitize(dirty) {
  if (!dirty) return dirty;
  const clean = Object.assign({}, dirty);
  [
    'password',
    'creditCard',
    'credit-card',
  ].forEach((k) => {
    if (clean[k]) clean[k] = '*****';
  });
  return clean;
}
