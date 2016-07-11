'use strict';

// Dependencies
import oDataParser from 'odata-parser';
import pluralize from 'pluralize';
import Boom from 'boom';
import _ from 'lodash';
import Ajv from 'ajv';
import Schema from '../schema';

// Init
const defaultOpts = {
    columns: [],
    schema: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        title: 'oData query parameters',
        type: 'object',
        properties: {
            $filter: {
                description: 'Filter result set',
                type: 'string'
            },
            $orderby: {
                description: 'Sort the result set',
                type: 'string'
            },
            $skip: {
                description: 'Skip this amount of records (offset)',
                type: 'integer',
                minimum: 0
            },
            $top: {
                description: 'Limit number of records to this number',
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10
            },
            $expand: {
                description: 'Expand related objects',
                type: 'string'
            },
            $select: {
                description: 'Return these attributes',
                type: 'string'
            },
            $count: {
                description: 'Add total result size to the output',
                type: 'boolean',
                default: false
            }
        }
    }
};
let ajv = new Ajv({
    allErrors: true,
    verbose: true,
    messages: true,
    jsonPointers: false,
    useDefaults: true,
    coerceTypes: true
});
ajv.addSchema(defaultOpts.schema, 'oDataQuery');

// Exports
export default class Parser {
    static get oDataFilterOperators() {
        return {
            eq: '=',
            ne: '<>',
            lt: '<',
            le: '<=',
            gt: '>',
            ge: '>=',
            and: 'andWhere',
            or: 'orWhere'
        };
    }
    static get oDataFilterFunctions() {
        return {
            startswith: (args) => {
                return (qb) => qb.where(args[0].name, 'like', `${args[1].value}%`);
            },
            endswith: (args) => {
                return (qb) => qb.where(args[0].name, 'like', `%${args[1].value}`);
            },
            contains: (args) => {
                return (qb) => qb.where(args[0].name, 'like', `%${args[1].value}%`);
            }
        };
    }
    constructor(query, opts) {
        this.options = {
            columns: opts.columns || defaultOpts.columns,
            schema: opts.schema || defaultOpts.schema
        };

        // Validate schema
        let schema = (this.options.schema === defaultOpts.schema) ? 'oDataQuery' : this.options.schema;
        let valid = ajv.validate(schema, query);
        if (!valid) throw Schema.parseValidationErrors(ajv.errors, schema, 'Invalid oData expression', query);

        // Parse
        this.parsed = this.constructor.parse(query, this.options);
    }
    parse() {
        return this.parsed;
    }
    static getError(errorObj, parameter, extra = {}, meta) {
        let msg = '';
        let type = extra.type || 'value';
        if (extra.value) {
            if (_.isArray(extra.value)) msg += `Unknown ${pluralize(type)} '${extra.value.join("', '")}`;
            else  msg += `Unknown ${type} '${extra.value}'`;
            msg += ` in parameter '${parameter}'. The provided '${parameter}' does not contain valid expression. Please try again with a valid expression.`;
        }
        else if (parameter) msg = `The provided '${parameter}' is not a valid expression. Please try again with a valid expression.`;
        else msg = 'An unknown error occurred while parsing the oData expression. Please try again with a valid expression.';
        return errorObj(msg, meta);
    }
    static parse(query, opts) {
        let out = {};
        [
            '$filter',
            '$orderby',
            '$skip',
            '$top',
            '$expand',
            '$select',
            '$count'
        ].forEach((k) => out[k] = this[k](query[k], opts));
        return out;
    }
    static $filter(value, opts) {
        let out = {};
        if (!value) return undefined;
        try {
            out = oDataParser.parse(`$filter=${value}`);
        } catch (err) {
            out.error = err;
        }
        if (out.error) {
            throw this.getError(Boom.badRequest, '$filter', undefined, {
                opts: opts,
                input: value,
                output: out
            });
        }
        return this._convertFilter(out.$filter, opts);
    }
    static $orderby(value, opts) {

    }
    static $skip(value, opts) {
        return value;
    }
    static $top(value, opts) {
        return value;
    }
    static $expand(value, opts) {
        return (value) ? value.replace(/\//g, '.').split(',') : undefined;
    }
    static $select(value, opts) {
        return (value) ? value.replace(/\//g, '.').split(',') : undefined;
    }
    static $count(value, opts) {
        return value;
    }
    static _convertFilter(filter, opts) {
        const builder = (obj) => {
            if (obj.left && obj.left.type === 'property' && obj.right && obj.right.type === 'literal' && this.oDataFilterOperators[obj.type]) {
                if (opts.columns.length > 0 && opts.columns.indexOf(obj.left.name) === -1) {
                    throw this.getError(Boom.badRequest, '$filter', {
                        value: obj.left.name,
                        type: 'attribute'
                    }, filter);
                }
                else if (_.isArray(obj.right.value) && _.difference(obj.right.value, ['null', '']).length === 0) {
                    if (obj.type === 'eq') return (qb) => qb.whereNull(obj.left.name);
                    else if (obj.type === 'ne') return (qb) => qb.whereNotNull(obj.left.name);
                    else throw this.getError(Boom.notImplemented, '$filter', {
                        value: obj.type,
                        type: 'operator'
                    }, filter);
                }
                else return (qb) => qb.where(obj.left.name, this.oDataFilterOperators[obj.type], obj.right.value);
            }
            else if (this.oDataFilterOperators[obj.type]) return (qb) => qb.where(builder(obj.left))[this.oDataFilterOperators[obj.type]](builder(obj.right));
            else if (obj.func && this.oDataFilterFunctions[obj.func]) return this.oDataFilterFunctions[obj.func](obj.args);
            else throw this.getError(Boom.notImplemented, '$filter', {
                value: obj.func || obj.type,
                type: (obj.func) ? 'function' : 'operator'
            }, filter);
        };
        return builder(filter);
    }
}