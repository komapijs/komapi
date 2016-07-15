'use strict';

// Dependencies
import _ from 'lodash';

// Exports
export default class SchemaValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
    descriptiveErrors() {
        const keys = ['path', 'keyword', 'message', 'data', 'allowedValues'];
        return _.map(this.errors, (error) =>  _.pick(error, keys));
    }
}