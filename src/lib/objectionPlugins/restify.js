'use strict';

// Dependencies
import _ from 'lodash';
import Boom from 'boom';
import oDataParser from 'odata-parser';
import RelationExpression from 'objection/lib/queryBuilder/RelationExpression';
import EagerFetcher from 'objection/lib/queryBuilder/EagerFetcher';
import ValidationError from 'objection/lib/ValidationError';

// Init
const defaultOpts = {
    $count: {
        default: false
    },
    $skip : {
        default: 0
    },
    $top: {
        allow: 100,
        default: 10
    },
    $select: {
        allow: false,
        default: false
    },
    $expand: {
        allow: [],
        default: []
    }
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
        static getDefaultColumns() {
            let cols = this.getIdColumnArray();
            _.forOwn(this.getRelations(), (v, k) => {
                if (v instanceof BaseModel.BelongsToOneRelation) cols.push(v.ownerCol);
            });
            cols = cols.map((v) => `${this.tableName}.${v}`);
            return cols;
        }
        static query() {
            return super.query().select(this.getDefaultColumns());
        }
        $query() {
            return super.$query().select(this.constructor.getDefaultColumns());
        }
        $relatedQuery(relationName) {
            const relatedClass = this.constructor.getRelation(relationName).relatedModelClass;
            return super.$relatedQuery(relationName).select(relatedClass.getIdColumnArray().map((v) => `${relatedClass.tableName}.${v}`));
        }
    }

    // Query builder
    class QueryBuilder extends Model.QueryBuilder {
        getAllowedColumns() {
            if (this.context().oDataFilter.$select.allow) return this.context().oDataFilter.$select.allow.concat(this._modelClass.getIdColumnArray());
            else if (this._modelClass.jsonSchema && this._modelClass.jsonSchema.properties) return Object.keys(this._modelClass.jsonSchema.properties).concat(this._modelClass.getIdColumnArray());
            return false;
        }
        oDataFilter(userQuery = {}, opts) {
            this.context().oDataFilter = opts = _.defaults({}, opts, defaultOpts);
            let columnsAllow = this.getAllowedColumns();
            let invalidColumns = [];
            let parameters = ['$top', '$skip', '$orderby', '$select', '$filter', '$expand'];
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

            // Prepare data
            query.$select = (query.$select) ? query.$select.map((v) => v.replace(/\//g, '.')) : [];
            let [selfColumns, relatedColumns] = _.partition(query.$select, (v) => v.indexOf('.') === -1);
            query.$count = userQuery.$count;

            // Create query
            if (query.$filter) this.where(applyFilter.call(this, query.$filter, opts));

            if (query.$orderby) query.$orderby.forEach((obj) => {
                return Object.keys(obj).forEach((k) => {
                    if (columnsAllow && columnsAllow.indexOf(k) === -1) throw Boom.badRequest(`The following error occurred: 'unknown attribute ${k} in $orderby'. Please try again with valid a oData expression`, query.$orderby);
                    this.orderBy(k, obj[k].toUpperCase());
                });
            });

            if (query.$skip) this.offset(query.$skip);
            else this.offset(opts.$skip.default);

            if (query.$top) this.limit( _.clamp(query.$top, 0, opts.$top.allow));
            else this.limit(opts.$top.default);

            if (query.$expand) {
                if (relatedColumns && relatedColumns.length > 0) this.context()._eagerColumns = RelationExpression.parse(createObjectionColumnExpressionFromArray(relatedColumns));
                this.eager(`[${query.$expand.join(',').replace(/\//g, '.')}]`);
            }

            if (selfColumns && selfColumns.length > 0) {
                if (columnsAllow && (invalidColumns = _.difference(selfColumns, columnsAllow)).length > 0) throw Boom.badRequest(`The following error occurred: 'unknown attributes ${invalidColumns.join(',')} in $select'. Please try again with valid a oData expression`, query.$select);
                this.columns(selfColumns);
            }
            else if (opts.$select.default) this.columns(opts.$select.default);

            if (query.$count) {
                if (['true', 'false', true, false].indexOf(query.$count) === -1) throw Boom.badRequest(`The following error occurred: 'unknown value ${query.$count} in $count'. Only 'true' or 'false' allowed. Please try again with valid a oData expression`, query.$count);
                query.$count = (['true', true].indexOf(query.$count) > -1);
            }
            else query.$count = opts.$count.default;

            this._oData = query;
            return this;
        }
        withMeta(type) {
            this.context().withMeta = type;
            return this;
        }
        asOne() {
            this.context().asOne = true;
            return this;
        }
        execute() {
            if (!this.context().withMeta) return super.execute();
            let promises = [
                super.execute()
            ];
            if (this._oData && this._oData.$count) promises.push(this.resultSize());
            return Promise.all(promises).then((res) => {
                let [models, total] = res;
                let out = {
                    '@odata.count': total
                };
                if (!this.context().asOne) out.value = models;
                else _.assign(out, models);
                return out;
            });
        }
    }

    // RelatedQuery builder
    class RelatedQueryBuilder extends Model.RelatedQueryBuilder {}

    Model.QueryBuilder = QueryBuilder;
    Model.RelatedQueryBuilder = RelatedQueryBuilder;

    // Override the eager fetching mechanism to only use explicit columns
    EagerFetcher.prototype._fetchRelation = _restifiedFetchRelation;

    return Model;
};

// Functions
function applyFilter(filter, opts) {
    const columns = this.getAllowedColumns();
    function builder(obj) {
        if (obj.left && obj.left.type === 'property' && obj.right && obj.right.type === 'literal' && oDataFilterOperators[obj.type]) {
            if (columns && columns.indexOf(obj.left.name) === -1) throw Boom.badRequest(`The following error occurred: 'unknown attribute ${obj.left.name} in $filter'. Please try again with valid a oData expression`, filter);
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
function _restifiedFetchRelation(relation, nextEager) {
    let queryBuilder = relation.ownerModelClass.RelatedQueryBuilder.forClass(relation.relatedModelClass).childQueryOf(this.rootQuery);
    let operation = relation.find(queryBuilder, this.models);

    queryBuilder.callQueryBuilderOperation(operation, []);

    _.each(nextEager.args, filterName => {
        let filter = this.filters[filterName];

        if (!_.isFunction(filter)) {
            throw new ValidationError({eager: 'could not find filter "' + filterName + '" for relation "' + relation.name + '"'});
        }

        filter(queryBuilder);
    });

    // Customizations
    let cols = relation.relatedModelClass.getDefaultColumns();
    if (this.rootQuery.context()._eagerColumns) {
        let eagerCols = this.rootQuery.context()._eagerColumns.childExpression(relation.name);
        if (eagerCols) {
            eagerCols = Object.keys(eagerCols.children).map((k) => {
                if (relation.relatedModelClass.relationMappings && relation.relatedModelClass.relationMappings[k]) return k;
                return `${relation.relatedModelClass.tableName}.${k}`;
            });
            cols = cols.concat(eagerCols);
        }
    }
    cols = _.uniq(cols);
    return queryBuilder.select(cols).debug().then(related => {
        return this._fetchNextEager(relation, related, nextEager);
    });
}
function createObjectionColumnExpressionFromArray(array) {
    let objectifiedArray = _.zipObjectDeep(array);
    let out = Object.keys(objectifiedArray).reduce(_createObjectionColumnExpression(objectifiedArray), '');
    return `[${out}]`;
    function _createObjectionColumnExpression(obj) {
        return function objectionColumnExpressionReducer(previousValue, currentValue, index, array) {
            let subValue = Object.keys(obj[currentValue]).reduce(_createObjectionColumnExpression(obj[currentValue]));
            let retval = `${currentValue}.[${subValue}]`;
            if (previousValue) retval = `${previousValue}, ${retval}`;
            return retval;
        };
    }
}