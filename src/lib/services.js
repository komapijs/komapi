// Dependencies
import _ from 'lodash';
import path from 'path';
import compose from 'koa-compose';
import getParameterNames from 'get-parameter-names';
import findFiles from './findFiles';

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
            return _.zipObject(parameters, args);
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
    const fn = compose(hooks.concat([args => originalOperation(..._.values(_.pick(args, normalizeArgs.parameters)))]));
    return (...args) => fn(normalizeArgs.curry(args));
}

// Exports
export default function loadServices(rootPath, app) {
    // Create a list of files
    const files = findFiles(rootPath);
    const services = {};

    // Handle the files
    files.forEach((file) => {
        file = path.resolve(file); // eslint-disable-line no-param-reassign
        const relPath = path.relative(rootPath, file)
                .split(path.sep)
                .join('/')
                .replace(/\/index.js$/, '')
                .replace(/.js$/, '')
                .replace(/^\/$/, '');

        const Service = require.main.require(file);

        // Bootstrap service
        const service = new Service(app, relPath);
        service.$setup();
        _.forOwn(service.$hooks(), (hooks, operation) => {
            if (service[operation]) service[operation] = manageOperation(service, operation, service[operation], hooks);
        });

        // Define name
        const name = (service.name || Service.name).replace(/Service$/, '');
        services[name] = service;
    });
    return services;
}
