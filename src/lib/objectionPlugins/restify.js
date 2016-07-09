'use strict';

// Dependencies
import _ from 'lodash';
import Boom from 'boom';
import oDataParser from 'odata-parser';

// Init
const defaultOpts = {
    columns: [],
    limit: Infinity
};
const oDataFilterOperators = {
    eq: '=',
    ne: '<>',
    lt: '<',
    le: '<=',
    gt: '>',
    ge: '>=',
    and: 'andWhere',
    or: 'orWhere'
};

// Exports
export default (BaseModel) => {

    // Model
    class Model extends BaseModel {
        static query() {
            let cols = this.getIdColumnArray();
            _.forOwn(this.getRelations(), (v, k) => {
                if (v instanceof BaseModel.BelongsToOneRelation) cols.push(v.ownerCol);
            });
            return super.query().columns(cols);
        }
        $query() {
            let cols = this.constructor.getIdColumnArray();

            return super.$query().columns(cols);
        }
        $relatedQuery(relationName) {
            const relatedClass = this.constructor.getRelation(relationName).relatedModelClass;
            return super.$relatedQuery(relationName).columns(relatedClass.getIdColumnArray().map((v) => `${relatedClass.tableName}.${v}`));
        }
    }

    // Query builder
    class QueryBuilder extends Model.QueryBuilder {
        execute() {
            if (!this.context().withMeta) return super.execute();
            let limit, offset;
            let promises = [
                super.execute()
            ];
            if (this._oData && this._oData.$count) promises.push(this.resultSize());
            return Promise.all(promises).then((res) => {
                let [models, total] = res;
                const result = {
                    pagination: {
                        $top: (typeof (limit = _.findLast(this._operations, ['name', 'limit'])) !== 'undefined' && _.isArray(limit = limit.args) && limit.length > 0) ? limit[0] : null,
                        $skip: (typeof (offset = _.findLast(this._operations, ['name', 'offset'])) !== 'undefined' && _.isArray(offset = offset.args) && offset.length > 0) ? offset[0] : 0,
                        $count: (typeof total !== 'undefined') ? total : undefined
                    },
                    data: models
                };
                return result;
            });
        }
    }

    // RelatedQuery builder
    class RelatedQueryBuilder extends Model.RelatedQueryBuilder {
        execute() {
            if (!this.context().withMeta) return super.execute();
            let limit, offset;
            let promises = [
                super.execute()
            ];
            if (this._oData && this._oData.$count) promises.push(this.resultSize());
            return Promise.all(promises).then((res) => {
                let [models, total] = res;
                const result = {
                    pagination: {
                        $top: (typeof (limit = _.findLast(this._operations, ['name', 'limit'])) !== 'undefined' && _.isArray(limit = limit.args) && limit.length > 0) ? limit[0] : null,
                        $skip: (typeof (offset = _.findLast(this._operations, ['name', 'offset'])) !== 'undefined' && _.isArray(offset = offset.args) && offset.length > 0) ? offset[0] : 0,
                        $count: (typeof total !== 'undefined') ? total : undefined
                    },
                    data: models
                };
                return result;
            });
        }
    }

    QueryBuilder.prototype._getColumns = RelatedQueryBuilder.prototype._getColumns = _getColumns;
    QueryBuilder.prototype.oDataFilter = RelatedQueryBuilder.prototype.oDataFilter = oDataFilter;
    QueryBuilder.prototype.withMeta = RelatedQueryBuilder.prototype.withMeta = withMeta;

    Model.QueryBuilder = QueryBuilder;
    Model.RelatedQueryBuilder = RelatedQueryBuilder;

    return Model;
};

// Functions
function _getColumns() {
    if (this._modelClass.jsonSchema && this._modelClass.jsonSchema.properties) return Object.keys(this._modelClass.jsonSchema.properties);
    return [];
}
function oDataFilter(userQuery = {}, opts) {
    let columns = this._getColumns();
    let invalidColumns = [];
    let parameters = ['$top', '$skip', '$orderby', '$select', '$filter'];
    let query = _.pick(userQuery, parameters);
    opts = _.defaults({}, opts, defaultOpts);
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

    // Create query
    if (query.$top) this.limit( _.clamp(query.$top, 0, opts.limit));

    if (query.$skip) this.offset(query.$skip);
    if (query.$orderby) query.$orderby.forEach((obj) => {
        return Object.keys(obj).forEach((k) => {
            if (columns.length > 0 && columns.indexOf(k) === -1) throw Boom.badRequest(`The following error occurred: 'unknown attribute ${k} in $orderby'. Please try again with valid a oData expression`, query.$orderby);
            this.orderBy(k, obj[k].toUpperCase());
        });
    });
    if (query.$filter) this.where(applyFilter.call(this, query.$filter, opts));
    if (query.$select) {
        if ((opts.columns.length > 0 || columns.length > 0) && (invalidColumns = _.difference(query.$select, opts.columns, columns)).length > 0) throw Boom.badRequest(`The following error occurred: 'unknown attributes ${invalidColumns.join(',')} in $select'. Please try again with valid a oData expression`, query.$select);
        this.columns(query.$select);
    }
    query.$count = userQuery.$count;
    this._oData = query;
    return this;
}
function applyFilter(filter, opts) {
    const columns = this._getColumns();
    function builder(obj) {
        if (obj.left && obj.left.type === 'property' && obj.right && obj.right.type === 'literal' && oDataFilterOperators[obj.type]) {
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
                this.where(obj.left.name, oDataFilterOperators[obj.type], obj.right.value);
            };
        }
        else if (oDataFilterOperators[obj.type]) return function () {
            this.where(builder(obj.left))[oDataFilterOperators[obj.type]](builder(obj.right));
        };

        else throw Boom.notImplemented(`The following error occurred: 'invalid operator ${(obj.func) ? `${obj.type} of type ${obj.func}` : obj.type} in $filter'. Please try again with valid a oData expression`, filter);
    }
    return builder(filter);
}
function withMeta(withMeta = true) {
    this.context().withMeta = withMeta;
    return this;
}