'use strict';

// Dependencies
import oDataParser from 'odata-parser';
import pluralize from 'pluralize';
import Boom from 'boom';
import _ from 'lodash';
import Ajv from 'ajv';
import Schema from '../schema';

// Init
let ajv = new Ajv({
    allErrors: true,
    verbose: true,
    messages: true,
    jsonPointers: false,
    useDefaults: true,
    coerceTypes: true
});

class Parser {
    static get defaultOptions() {
        return {
            reference: {},
            columns: [],
            relations: [],
            maxRecursionDepth: 2,
            maxRelations: 10,
            maxColumns: 50,
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
    }
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
        this.query = query;
        this.options = _.defaultsDeep({}, opts, this.constructor.defaultOptions);

        // Validate schema
        let schema = (this.options.schema === this.constructor.defaultOptions.schema) ? 'oDataQuery' : this.options.schema;
        let valid = ajv.validate(schema, this.query);
        if (!valid) throw Schema.parseValidationErrors(ajv.errors, schema, 'Invalid oData expression', this.query);
    }
    getError(errorObj, parameter, extra = {}, meta = {}) {
        meta.options = this.options;
        let msg = '';
        let type = extra.type || 'value';
        let what = (extra.reason) ? 'Invalid' : 'Unknown';
        if (extra.value) {
            if (_.isArray(extra.value)) msg += `${what} ${pluralize(type)} '${extra.value.join("', '")}`;
            else  msg += `${what} ${type} '${extra.value}'`;
            if (extra.reason) msg += ` in parameter '${parameter}'. ${extra.reason}. Please try again with a valid expression.`;
            else msg += ` in parameter '${parameter}'. Please try again with a valid expression.`;
        }
        else if (parameter) msg = `The provided '${parameter}' is not a valid expression. Please try again with a valid expression.`;
        else msg = 'An unknown error occurred while parsing the oData expression. Please try again with a valid expression.';
        return errorObj(msg, meta);
    }
    parse() {
        let out = {};
        [
            '$filter',
            '$orderby',
            '$skip',
            '$top',
            '$expand',
            '$select',
            '$count'
        ].forEach((k) => out[k] = this[k](this.query[k]));
        return out;
    }
    $filter(value) {
        let out = {};
        if (!value) return undefined;
        try {
            out = oDataParser.parse(`$filter=${value}`);
        } catch (err) {
            out.error = err;
        }
        if (out.error) {
            throw this.getError(Boom.badRequest, '$filter', undefined, {
                input: value,
                output: out
            });
        }
        return this._convertFilter(out.$filter);
    }
    $orderby(value, opts) {

    }
    $skip(value) {
        return value;
    }
    $top(value) {
        return value;
    }
    $expand(value) {
        if (value) {
            value = value.replace(/\//g, '.').split(',');
            value = this._convertToEagerExpression(value, '$expand');
            // if (value.length > opts.maxRelations) {
            //     throw this.getError(Boom.badRequest, '$expand', {
            //         value: value.length,
            //         reason: `Only '${opts.maxRelations}' relations allowed`
            //     }, {
            //         $expand: value.join(',')
            //     });
            // }
            // value.forEach((v) => {
            //     let subV = v.split('/');
            //     if (subV.length > opts.maxRecursionDepth) {
            //         throw this.getError(Boom.badRequest, '$expand', {
            //             value: v,
            //             reason: `Only '${opts.maxRecursionDepth}' nested relations allowed`
            //         }, {
            //             $expand: value.join(',')
            //         });
            //     }
            //     if (opts.reference) {}
            //     else {
            //
            //     }
            // });
        }
        return value;
    }
    $select(value) {
        if (!value) return {};
        let [$select, $expand] = _.partition(value.replace(/\//g, '.').split(','), (v) => v.indexOf('.') === -1);
        $expand = this._convertToEagerExpression($expand, '$select');
        return {
            $select,
            $expand
        };
    }
    $count(value) {
        return value;
    }
    _convertFilter(filter) {
        const builder = (obj) => {
            if (obj.left && obj.left.type === 'property' && obj.right && obj.right.type === 'literal' && this.constructor.oDataFilterOperators[obj.type]) {
                if (this.options.columns.length > 0 && this.options.columns.indexOf(obj.left.name) === -1) {
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
                else return (qb) => qb.where(obj.left.name, this.constructor.oDataFilterOperators[obj.type], obj.right.value);
            }
            else if (this.constructor.oDataFilterOperators[obj.type]) return (qb) => qb.where(builder(obj.left))[this.constructor.oDataFilterOperators[obj.type]](builder(obj.right));
            else if (obj.func && this.constructor.oDataFilterFunctions[obj.func]) return this.constructor.oDataFilterFunctions[obj.func](obj.args);
            else throw this.getError(Boom.notImplemented, '$filter', {
                value: obj.func || obj.type,
                type: (obj.func) ? 'function' : 'operator'
            }, filter);
        };
        return builder(filter);
    }
    _convertToEagerExpression(array, type = null) {

        // Validate top-level max number of columns/relations
        if (type) {
            let maxLength = (type === '$select') ? this.options.maxColumns : this.options.maxRelations;
            let typeDesc = (type === '$select') ? 'attributes' : 'relations';
            if (array.length > maxLength) {
                throw this.getError(Boom.badRequest, type, {
                    value: array.length,
                    type: `number of ${typeDesc}`,
                    reason: `Only '${maxLength}' ${typeDesc} allowed in the same request`
                });
            }
        }

        let currentRef = this.options.reference;
        let objectifiedArray = _.zipObjectDeep(array);
        let depth = (type === '$select') ? -1 : 0;

        // Recursive function
        let createObjectionColumnExpression = (obj) => {
            depth++;
            if (type && depth > this.options.maxRecursionDepth) {
                throw this.getError(Boom.badRequest, type, {
                    value: depth,
                    type: 'number of nested relations',
                    reason: `Only '${this.options.maxRecursionDepth}' nested relations allowed`
                });
            }
            return function objectionColumnExpressionReducer(previousValue, currentValue, index, array) {
                let retval = currentValue;
                if (obj[currentValue]) {
                    let subValue = Object.keys(obj[currentValue]).reduce(createObjectionColumnExpression(obj[currentValue]));
                    retval = `${currentValue}.[${subValue}]`;
                }
                if (previousValue) retval = `${previousValue},${retval}`;
                return retval;
            };
        };

        // Parse
        let out = Object.keys(objectifiedArray).reduce(createObjectionColumnExpression(objectifiedArray), '');
        return `[${out}]`;
    }
}

// Add schema
ajv.addSchema(Parser.defaultOptions.schema, 'oDataQuery');

// Exports
export default Parser;