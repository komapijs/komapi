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
            resource: null,
            idColumnArray: [],
            columns: null,
            relations: null,
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
        let what = (extra.reason) ? 'Invalid' : 'Unknown';
        if (extra.value) {
            if (_.isArray(extra.value) && extra.value.length === 1) extra.value = extra.value[0];
            let type = extra.type || 'value';
            if (_.isArray(extra.value)) {
                type = pluralize(type);
                msg += `${what} ${type} '[${extra.value.join("', '")}]'`;
            }
            else  msg += `${what} ${type} '${extra.value}'`;
            if (extra.reason) msg += ` in parameter '${parameter}'. ${extra.reason}. Please try again with a valid expression.`;
            else if (extra.appendReason) msg += ` in parameter '${parameter}'. ${_.upperFirst(type)} ${extra.appendReason}. Please try again with a valid expression.`;
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
        return this._convertExpand(value);
    }
    $select(value) {
        return this._convertSelect(value);
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
    _convertSelect(value) {
        if (!value) return null;
        let [$select, $expand] = _.partition(value.replace(/\//g, '.').split(','), (v) => v.indexOf('.') === -1);

        // Validate
        if (($select.length + $expand.length) > this.options.maxColumns) {
            throw this.getError(Boom.badRequest, '$select', {
                value: ($select.length + $expand.length),
                type: `number of attributes`,
                reason: `Only '${this.options.maxColumns}' attributes allowed in the same request`
            });
        }

        let objectifiedArray = _.zipObjectDeep($expand);
        let parser = this;
        function buildExpandSelect(obj) {
            function splitKey(obj, reference, path, depth = -1) {
                depth++;
                let out = {
                    key: [],
                    val: []
                };
                _.forOwn(obj, (v, k) => {
                    let nextPath = (path) ? `${path}.${k}` : k;
                    if (depth > parser.options.maxRecursionDepth) {
                        throw parser.getError(Boom.badRequest, '$select', {
                            value: path.replace(/\./g, '/'),
                            type: 'attribute path',
                            reason: `Only '${parser.options.maxRecursionDepth}' levels of nesting allowed`
                        });
                    }
                    if (v) {
                        let newReference = (reference.resource && reference.resource.registry && reference.resource.Model && reference.resource.Model.relationMappings && reference.resource.Model.relationMappings[k]) ? _.get(reference, `resource.registry.${reference.resource.Model.getRelation(k).relatedModelClass.name}.oDataOptions`) : reference;
                        if (!reference.relations || !newReference || reference.relations.indexOf(k) === -1) {
                            throw parser.getError(Boom.badRequest, '$select', {
                                value: nextPath.replace(/\./g, '/'),
                                type: 'relation',
                                appendReason: `does not exist`
                            });
                        }
                        let sub = splitKey(v, newReference, nextPath, depth);
                        let key = [sub.key].concat(_.fill([], sub.key, 0, reference.idColumnArray.length));
                        let val = [sub.val].concat(reference.idColumnArray);

                        out.key.push(key);
                        out.val.push(val);
                    }
                    else {
                        if (!reference.columns || reference.columns.indexOf(k) === -1) {
                            throw parser.getError(Boom.badRequest, '$select', {
                                value: path.replace(/\./g, '/'),
                                type: 'attribute',
                                appendReason: `does not exist`
                            });
                        }
                        out.key.push(path);
                        out.val.push(k);
                    }
                });

                // Reset
                depth = 0;
                return out;
            }
            let o = splitKey(obj, (parser.resource) ? parser.resource.oDataOptions : parser.options);
            return _.zipObject(o.key, o.val);
        }
        function verifySelect(attributes) {
            let reference = (parser.resource) ? parser.resource.oDataOptions : parser.options;
            let invalidColumns = [];
            if (reference.columns && (invalidColumns = _.difference(attributes, reference.columns)).length > 0) {
                let type = 'attribute';
                throw parser.getError(Boom.badRequest, '$select', {
                    value: invalidColumns,
                    type: type,
                    appendReason: `does not exist`
                });
            }
            return attributes;
        }
        return {
            $select: verifySelect($select),
            $expand: buildExpandSelect(objectifiedArray)
        };
    }
    _convertExpand(value) {
        if (!value) return null;
        let array = value.replace(/\//g, '.').split(',');

        // Validate
        if ((array.length) > this.options.maxRelations) {
            throw this.getError(Boom.badRequest, '$expand', {
                value: array.length,
                type: `number of relations`,
                reason: `Only '${this.options.maxRelations}' relations allowed in the same request`
            });
        }

        let objectifiedArray = _.zipObjectDeep(array);
        let parser = this;
        function buildEagerExpression(obj) {
            function splitKey(obj, reference, path, depth = 0) {
                depth++;
                if (depth > parser.options.maxRecursionDepth) {
                    throw parser.getError(Boom.badRequest, '$expand', {
                        value: depth,
                        type: 'number of nested relations',
                        reason: `Only '${parser.options.maxRecursionDepth}' nested relations allowed`
                    });
                }

                let out = [];
                _.forOwn(obj, (v, k) => {
                    path = (path) ? `${path}.${k}` : k;
                    let newReference = (reference.resource && reference.resource.registry && reference.resource.Model && reference.resource.Model.relationMappings && reference.resource.Model.relationMappings[k]) ? _.get(reference, `resource.registry.${reference.resource.Model.getRelation(k).relatedModelClass.name}.oDataOptions`) : reference;
                    if (!reference.relations || !newReference || reference.relations.indexOf(k) === -1) {
                        throw parser.getError(Boom.badRequest, '$expand', {
                            value: path.replace(/\./g, '/'),
                            type: 'relation',
                            appendReason: `does not exist`
                        });
                    }
                    let retval = k;
                    if (v) {
                        let subValues = splitKey(v, newReference, path, depth);
                        retval = (subValues.indexOf(',') > -1) ? `${k}.[${subValues}]` : `${k}.${subValues}`;
                    }
                    out.push(`${retval}`);
                });
                return out.join(',');
            }
            return splitKey(obj, (parser.resource) ? parser.resource.oDataOptions : parser.options);
        }
        let out = buildEagerExpression(objectifiedArray);
        return `[${out}]`;
    }
}

// Add schema
ajv.addSchema(Parser.defaultOptions.schema, 'oDataQuery');

// Exports
export default Parser;