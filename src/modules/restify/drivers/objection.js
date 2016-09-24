'use strict';

// Dependencies
import {forOwn, zipObjectDeep} from 'lodash';

// Exports
export default class ObjectionDriver {
    //
    // Public API
    //
    static getOptions(Model) {
        let cols = Model.restSchema && Object.keys(Model.restSchema.properties) || Model.jsonSchema && Object.keys(Model.jsonSchema.properties);
        if (cols) cols = Model.getIdColumnArray().concat(cols);
        return {
            querySchema: Model.querySchema,
            $select: cols,
            $expand: Model.relationMappings && Object.keys(Model.relationMappings)
        };
    }
    static apply(queryBuilder, query) {
        queryBuilder.select(this.getDefaultColumns(queryBuilder));
        // if (query.filter) queryBuilder.where(query.filter); // TODO: Disabled while determining query syntax - probably oData filter syntax
        if (query.sort) query.sort.forEach((v) => {
            if (v.startsWith('-')) return queryBuilder.orderBy(v.substr(1), 'desc');
            return queryBuilder.orderBy(v.substr(1), 'asc');
        });
        if (query.offset) queryBuilder.offset(query.offset);
        if (query.limit) queryBuilder.limit(query.limit);
        if (query.expand && query.expand.length > 0) {
            let expand = this.convertExpand(query.expand, query.expandSelect);
            queryBuilder.eager(expand.relations);
            forOwn(expand.columns, (v, k) => {
                queryBuilder.filterEager(k, (qb) => qb.select(this.getDefaultColumns(qb)).omit(this.getBelongsToOneColumns(qb)).columns(v));
            });
        }
        if (query.select) queryBuilder.columns(query.select);
        if (query.count) queryBuilder.context().withCount = query.count;
        return queryBuilder;
    }

    //
    // Helper methods
    //
    static getDefaultColumns(queryBuilder) {
        let Model = queryBuilder._modelClass;
        
        // Add id columns
        let cols = Model.getIdColumnArray();

        // Add belongs to columns
        cols = cols.concat(this.getBelongsToOneColumns(queryBuilder));

        // Add table name to column definitions
        cols = cols.map((v) => `${Model.tableName}.${v}`);
        
        return cols;
    }
    static getBelongsToOneColumns(queryBuilder) {
        let Model = queryBuilder._modelClass;
        let cols = [];
        forOwn(Model.getRelations(), (v, k) => {
            if (v instanceof Model.BelongsToOneRelation) cols = cols.concat(v.ownerCol);
        });
        return cols;
    }
    static convertExpand(array, columns) {
        let objectifiedArray = zipObjectDeep(array.map((v) => v.replace(/\//g, '.')));
        function buildEagerExpression(obj) {
            let out = {
                relations: [],
                columns: {}
            };
            function splitKey(obj, path) {
                let relations = [];
                forOwn(obj, (v, k) => {
                    let newPath = (path) ? `${path}/${k}` : k;
                    let retval = k;
                    if (v) {
                        let subValues = splitKey(v, newPath);
                        retval = (subValues.indexOf(',') > -1) ? `${k}.[${subValues}]` : `${k}.${subValues}`;
                    }
                    relations.push(retval);
                    out.columns[newPath.replace(/\//g, '.')] = columns[newPath];
                });
                relations = relations.join(',');
                return relations;
            }
            out.relations = `[${splitKey(obj)}]`;
            return out;
        }
        return buildEagerExpression(objectifiedArray);
    }
}