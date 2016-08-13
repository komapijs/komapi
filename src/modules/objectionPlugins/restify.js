'use strict';

// Dependencies
import _ from 'lodash';

// Exports
export default (BaseModel) => {
    class Model extends BaseModel {
        /**
         * @returns {Array.<string>}
         */
        static get systemColumns() {
            let systemColumns = super.systemColumns;
            return systemColumns.concat(this.getIdColumnArray());
        }
        static getDefaultColumns() {
            let cols = this.getIdColumnArray().concat(this.getBelongsToOneColumns());
            cols = cols.map((v) => `${this.tableName}.${v}`);
            return cols;
        }
        static getBelongsToOneColumns() {
            let cols = [];
            _.forOwn(this.getRelations(), (v, k) => {
                if (v instanceof BaseModel.BelongsToOneRelation) cols = cols.concat(v.ownerCol);
            });
            return cols;
        }
        $omitFromJson() {
            return this.constructor.getBelongsToOneColumns();
        }

        /**
         * @param {Array.<string>=} allowedColumns
         * @returns {?Array.<string>}
         */
        static getAllColumns(pick) {
            let columns = [];
            if (pick) columns = this.systemColumns.concat(pick);
            else if (this.jsonSchema && this.jsonSchema.properties) columns = this.systemColumns.concat(Object.keys(this.jsonSchema.properties));
            return _.uniq(columns);
        }
    }

    // Query builder
    class QueryBuilder extends Model.QueryBuilder {

        static forClass(modelClass) {
            return super.forClass(modelClass).select(modelClass.getDefaultColumns());
        }

        /**
         * Apply filters to the result
         *
         * @param {Object=} query
         * @returns {QueryBuilder}
         */
        restifyFilter(query = {}) {
            if (query.filter) this.where(query.filter);
            if (query.sort) query.sort.forEach((v) => {
                if (v.startsWith('-')) return this.orderBy(v.substr(1), 'desc');
                if (v.startsWith('+')) v = v.substr(1);
                return this.orderBy(v);
            });
            if (query.offset) this.offset(query.offset);
            if (query.limit) this.limit(query.limit);
            if (query.expand && query.expand.length > 0) {
                let expand = convertExpand(query.expand, query.expandSelect);
                this.eager(expand.relations);
                _.forOwn(expand.columns, (v, k) => {
                    this.filterEager(k, (qb) => qb.columns(v));
                });
            }
            if (query.select) this.columns(query.select);
            if (query.count) this.context().withCount = query.count;
            return this;
        }
        withMeta(type) {
            this.context().withMeta = type;
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
                    '@count': total
                };
                out.value = models;
                return out;
            });
        }
    }

    // RelatedQuery builder
    class RelatedQueryBuilder extends Model.RelatedQueryBuilder {
        static forClass(modelClass) {
            return super.forClass(modelClass).select(modelClass.getDefaultColumns());
        }
    }

    Model.QueryBuilder = QueryBuilder;
    Model.RelatedQueryBuilder = RelatedQueryBuilder;

    return Model;
};

// Functions
function convertExpand(array, columns = {}) {
    let objectifiedArray = _.zipObjectDeep(array.map((v) => v.replace(/\//g, '.')));
    function buildEagerExpression(obj) {
        let out = {
            relations: [],
            columns: {}
        };
        function splitKey(obj, path) {
            let relations = [];
            _.forOwn(obj, (v, k) => {
                let newPath = (path) ? `${path}/${k}` : k;
                let retval = k;
                if (v) {
                    let subValues = splitKey(v, newPath);
                    retval = (subValues.indexOf(',') > -1) ? `${k}.[${subValues}]` : `${k}.${subValues}`;
                }
                relations.push(retval);
                if (columns[newPath]) out.columns[newPath.replace(/\//g, '.')] = columns[newPath];
            });
            relations = relations.join(',');
            return relations;
        }
        out.relations = `[${splitKey(obj)}]`;
        return out;
    }
    return buildEagerExpression(objectifiedArray);
}