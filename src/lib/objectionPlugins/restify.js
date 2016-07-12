'use strict';

// Dependencies
import _ from 'lodash';
import Parser from '../restify/parser';

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
        static getSystemColumns() {
            return this.getIdColumnArray();
        }
        static getAllColumns(allowedColumns) {
            if (allowedColumns) return allowedColumns.concat(this.getSystemColumns());
            else if (this.jsonSchema && this.jsonSchema.properties) return Object.keys(this.jsonSchema.properties).concat(this.getSystemColumns());
            return null;
        }
    }

    // Query builder
    class QueryBuilder extends Model.QueryBuilder {
        getAllowedColumns(allowedColumns) {
            return this._modelClass.getAllColumns(allowedColumns);
        }
        oDataFilter(oDataQuery = {}, opts) {
            opts.columns = this.getAllowedColumns(opts.columns);
            let parser = new Parser(oDataQuery, opts);
            let query = parser.parse();

            // Create query
            if (query.$filter) this.where(query.$filter);
            if (query.$orderby) _.forEach(query.$orderby, this.orderBy);
            if (query.$skip) this.offset(query.$skip);
            if (query.$top) this.limit(query.$top);
            if (query.$expand)  this.eager(query.$expand);
            if (query.$select) {
                if (query.$select.$select) this.columns(query.$select.$select);
                if (query.$select.$expand) {
                    _.forOwn(query.$select.$expand, (v, k) => {
                        this.filterEager(k, (qb) => qb.select(v));
                    });
                }
            }
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

    return Model;
};