'use strict';

// Dependencies
import Joi from 'joi';
import _ from 'lodash';
import Boom from 'boom';
import oDataParser from 'odata-parser';

// Init
const defaultOpts = {
    limit: Infinity
};

// Exports
export default (Bookshelf) => {
    const Model = Bookshelf.Model;
    const Collection = Bookshelf.Collection;
    Bookshelf.Model = Model.extend({
        hidden: ['password', 'secret', 'salt', 'token']
    }, {
        _oDataColumns: function _oDataColumns() {
            let columns = [];
            if (this.prototype.visible) columns = this.prototype.visible;
            else if (this.prototype.schema) {
                if (this.prototype.schema.isJoi) columns = _.map(this.prototype.schema._inner.children, 'key');
                else columns = columns.concat(Object.keys(this.prototype.schema));
            }
            if (this.prototype.hidden) columns = _.without(columns, ...this.prototype.hidden);
            return columns;
        },
        _oDataSchema: function _oDataSchema(opts) {
            const columns = this._oDataColumns();
            return Joi.object({
                $filter: Joi.object().optional(),
                $top: Joi.number().integer().min(1).max(opts.limit).optional(),
                $skip: Joi.number().integer().min(0).optional(),
                $select: (columns.length > 0) ? Joi.array().items(Joi.string().valid(columns)).optional() : Joi.array().optional(),
                $orderby: (columns.length > 0) ? Joi.array().items(Joi.object().keys(_.zipObject(columns, _.fill(Array(columns.length), Joi.any())))) : Joi.array().optional()
            });
        },
        _oDataFilterOperators: {
            eq: '=',
            ne: '<>',
            lt: '<',
            le: '<=',
            gt: '>',
            ge: '>=',
            and: 'andWhere',
            or: 'orWhere'
        },
        _oDataFilter: function _oDataFilter(filter) {
            const that = this;
            const columns = this._oDataColumns();
            function builder(obj) {
                if (obj.left && obj.left.type === 'property' && obj.right && obj.right.type === 'literal' && that._oDataFilterOperators[obj.type]) {
                    if (columns.length > 0 && columns.indexOf(obj.left.name) === -1) throw Boom.badRequest(`The following error occurred: 'unknown attribute ${obj.left.name} in $filter'. Please try again with valid a oData expression`, filter);
                    if (_.isArray(obj.right.value) && _.difference(obj.right.value, ['null', '']).length === 0) {
                        if (obj.type === 'eq') return function () {
                            this.whereNull(obj.left.name);
                        };
                        else if (obj.type === 'ne') return function () {
                            this.whereNotNull(obj.left.name);
                        };
                        else throw Boom.notImplemented(`The following error occurred: 'invalid operator ${obj.type} in $filter for ${obj.right.value}'. Please try again with valid a oData expression`, filter);
                    }
                    else return function () {
                        this.where(obj.left.name, that._oDataFilterOperators[obj.type], obj.right.value);
                    };
                }
                else if (that._oDataFilterOperators[obj.type]) return function () {
                    this.where(builder(obj.left))[that._oDataFilterOperators[obj.type]](builder(obj.right));
                };

                else throw Boom.notImplemented(`The following error occurred: 'invalid operator ${(obj.func) ? `${obj.type} of type ${obj.func}` : obj.type} in $filter'. Please try again with valid a oData expression`, filter);
            }
            return builder(filter);
        },
        oDataFetchAll: function oDataFetchAll(userQuery = {}, fetchOpts = {}, opts = {}) {

            // Define
            opts = _.defaults({}, opts, defaultOpts);
            const collection = this.collection();
            let schema = this._oDataSchema(opts);
            let parameters = ['$top', '$skip', '$orderby', '$select', '$filter'];
            let query = _.pick(userQuery, parameters);
            try {
                if (Object.keys(query).length > 0) {
                    query = oDataParser.parse(_.reduce(query, function reduceQueryToString(result, value, key) {
                        if (result !== '') result += '&';
                        return `${result}${key}=${value}`;
                    }, ''));
                    if (query.error) throw Boom.badRequest(`The following error occurred: '${query.error}'. Please try again with valid a oData expression`, query);
                }
            }
            catch (err) {
                if (err.isBoom) throw err;
                throw Boom.badRequest('There was an unknown error in your oData expression. Please try again with valid a oData expression', err);
            }

            // Validate
            let result = Joi.validate(query, schema, {
                abortEarly: false
            });
            if (result.error) throw result.error;

            // Create query
            if (query.$top) {
                collection.limit(query.$top , opts.limit);
                query.$top = collection.limit(query.$top , opts.limit)._knex._single.limit;
            }
            if (query.$skip) collection.offset(query.$skip);
            if (query.$orderby) query.$orderby.forEach((obj) => {
                return Object.keys(obj).forEach((k) => {
                    collection.orderBy(k, obj[k].toUpperCase());
                });
            });
            if (query.$filter) collection.query().where(this._oDataFilter(query.$filter));

            // Do query
            fetchOpts = _.defaults({}, {
                columns: query.$select
            }, fetchOpts);
            return collection.fetch(fetchOpts)
                .then(function createResultSet(models) {
                    let pagination = {
                        $top: query.$top || null,
                        $skip: query.$skip || 0
                    };
                    return {
                        pagination: pagination,
                        data: models
                    };
                })
                .then((result) => {
                    if (userQuery.$count) return result.data.count()
                        .then((count) => {
                            result.pagination.$count = count;
                            return result;
                        });
                    else return result;
                });
        }
    });
    Bookshelf.Collection = Collection.extend({
        limit: function limit(limit, maxLimit = Infinity) {
            return this.query((qb) => qb.limit( _.clamp(limit, 0, maxLimit)));
        },
        offset: function offset(offset) {
            return this.query((qb) => qb.offset(offset));
        },
        orderBy: function orderBy(column, direction) {
            return this.query((qb) => qb.orderBy(column, direction));
        }
    });
};