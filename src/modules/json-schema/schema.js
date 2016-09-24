'use strict';

// Dependencies
import Ajv from 'ajv';
import {defaultsDeep, map, pick} from 'lodash';
import moment from 'moment';
import {badRequest} from 'boom';

// Init
const defaultOpts = {
    allErrors: true,
    verbose: true,
    formats: {'iso8601': (v) => moment(v, moment.ISO_8601, true).isValid()},
    messages: true,
    jsonPointers: true,
    format: 'full'
};
const mapping = {
    enum: (e, out) => {
        out.allowedValues = e.schema;
        return out;
    },
    required: (e, out) => {
        out.path += `/${e.params.missingProperty}`;
        out.message = 'should be present';
        out.data = null;
        return out;
    }
};

// Exports
export default class Schema extends Ajv {
    constructor(opts) {
        super(defaultsDeep(defaultOpts, opts));
    }
    static validationError(errors, schema, message, data) {
        message = message || ((data) ? 'Invalid data provided' : 'No data provided');
        const keys = ['path', 'keyword', 'message', 'data', 'allowedValues'];
        let err = new badRequest(message);
        err.$schema = schema;
        err.errors = (data && errors) ? map(errors, (error) => this._getDescriptiveError(error)) : [];
        err.output.payload.errors = map(err.errors, (error) => pick(error, keys));
        return err;
    }
    static _getDescriptiveError(error) {
        let descriptiveError = {
            path: error.dataPath,
            keyword: error.keyword,
            message: error.message,
            data: error.data
        };
        if (mapping[error.keyword]) descriptiveError = mapping[error.keyword](error, descriptiveError);
        descriptiveError.metadata = error;
        return descriptiveError;
    }
}