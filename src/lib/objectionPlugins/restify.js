'use strict';

// Dependencies
import _ from 'lodash';
import Parser from '../restify/parser';
import RelationExpression from 'objection/lib/queryBuilder/RelationExpression';
import EagerFetcher from 'objection/lib/queryBuilder/EagerFetcher';
import ValidationError from 'objection/lib/ValidationError';

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
        getAllowedColumns(allowedColumns = []) {
            if (allowedColumns.length > 0) return allowedColumns.concat(this._modelClass.getIdColumnArray());
            else if (this._modelClass.jsonSchema && this._modelClass.jsonSchema.properties) return Object.keys(this._modelClass.jsonSchema.properties).concat(this._modelClass.getIdColumnArray());
            return [];
        }
        oDataFilter(oDataQuery = {}, opts) {
            opts.columns = this.getAllowedColumns(opts.columns);
            let parser = new Parser(oDataQuery, opts);
            let query = parser.parse();

            // Prepare data
            // Create query
            if (query.$filter) this.where(query.$filter);
            if (query.$orderby) _.forEach(query.$orderby, this.orderBy);
            if (query.$skip) this.offset(query.$skip);
            if (query.$top) this.limit(query.$top);
            if (query.$expand) {
                if (query.$select && query.$select.$expand) this.context()._eagerColumns = RelationExpression.parse(query.$select.$expand);
                this.eager(query.$expand);
            }
            if (query.$select && query.$select.$select) this.columns(query.$select.$select);
            if (query.$count) this.context().withCount = query.$count;
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
            if (this.context().withCount) promises.push(this.resultSize());
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
    return queryBuilder.select(cols).then(related => {
        return this._fetchNextEager(relation, related, nextEager);
    });
}