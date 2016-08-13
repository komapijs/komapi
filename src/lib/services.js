'use strict';

// Dependencies
import _ from 'lodash';
import path from 'path';
import findFiles from './findFiles';
import compose from 'koa-compose';
import getParameterNames from 'get-parameter-names';

// Exports
export default function loadServices(rootPath, app) {

    // Create a list of files
    const files = findFiles(rootPath);

    // Handle the files
    files.forEach((file) => {
        file = path.resolve(file);
        let relPath = path.relative(rootPath, file)
                .split(path.sep)
                .join('/')
                .replace(/\/index.js$/, '')
                .replace(/.js$/, '')
                .replace(/^\/$/, '');

        const Service = require.main.require(file);

        // Bootstrap service
        let service = new Service(app, relPath);
        service.$setup();
        _.forOwn(service.$hooks(), (hooks, operation) => {
            if (service[operation]) service[operation] = manageOperation(service, operation, service[operation], hooks);
        });

        // Define name
        let name = (service.name || Service.name).replace(/Service$/, '');
        app.service[name] = service;
    });
}

// Functions
/**
 * Structure args into object with parameter names
 * @param {Function} fn
 * @returns {Object}
 */
function structuredArgs(fn){
    let parameters = getParameterNames(fn);
    return {
        parameters: parameters,
        curry: function structuredArgs(args) {
            return _.zipObject(parameters, args);
        }
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
    const normalizeArgs = structuredArgs(originalOperation);
    originalOperation = originalOperation.bind(service);
    const fn = compose(hooks.concat([(args) => originalOperation(..._.values(_.pick(args, normalizeArgs.parameters)))]));
    return (...args) => fn(normalizeArgs.curry(args));
}