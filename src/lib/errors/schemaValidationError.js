'use strict';

// Exports
export default class SchemaValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}