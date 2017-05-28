// Dependencies
import { zipObject, values, pick, forOwn, mapValues } from 'lodash';
import compose from 'koa-compose';
import getParameterNames from 'get-parameter-names';

// Functions
/**
 * Structure args into object with parameter names
 * @param {Function} fn
 * @returns {Object}
 */
function structureArgs(fn) {
  const parameters = getParameterNames(fn);
  return {
    parameters,
    curry: function structuredArgs(args) {
      return zipObject(parameters, args);
    },
  };
}

/**
 * Create a managed operation
 * @param {Service} service
 * @param {String} operation
 * @param {Function} originalOperation
 * @param {Array} hooks
 * @returns {Function}
 */
function manageOperation(service, operation, originalOperation, hooks) {
  const normalizeArgs = structureArgs(originalOperation);
  originalOperation = originalOperation.bind(service); // eslint-disable-line no-param-reassign
  const fn = compose(hooks.concat([args => originalOperation(...values(pick(args, normalizeArgs.parameters)))]));
  return (...args) => fn(normalizeArgs.curry(args));
}

// Exports
export default function loadServices(services, app) {
  return mapValues(services, (Service, name) => {
    // Bootstrap service
    const service = new Service(app, name);
    service.$setup();
    forOwn(service.$hooks(), (hooks, operation) => {
      if (service[operation]) service[operation] = manageOperation(service, operation, service[operation], hooks);
    });
    return service;
  });
}
