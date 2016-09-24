'use strict';

// Dependencies
import cloneDeep from 'lodash/cloneDeep';
import Schema from '../json-schema/schema';
import ObjectionDriver from './drivers/objection';

// Init
const defaultOptions = {
    driver: ObjectionDriver
};
let schema = new Schema({
    useDefaults: true,
    coerceTypes: true
});

// Exports
export default class Parser {
    static get $defaultSchema() {
        return {
            $schema: 'http://json-schema.org/draft-04/schema#',
            title: 'Komapi REST query parameters',
            type: 'object',
            properties: {
                $filter: {
                    description: 'Filter result set',
                    type: 'string'
                },
                $sort: {
                    description: 'Sort the result set',
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    uniqueItems: true
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
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    uniqueItems: true
                },
                $select: {
                    description: 'Limit returned attributes to these attributes',
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    uniqueItems: true
                },
                $count: {
                    description: 'Add total number of records to response',
                    type: 'boolean',
                    default: false
                }
            }
        };
    }
    get $schema() {
        return this._schema;
    }
    set $schema(customSchema) {
        this._schema = customSchema;
        this.$validator = schema.compile(this.$schema);
    }
    constructor(Model, opts = {}) {
        opts = Object.assign({}, defaultOptions, opts);
        this.$driver = opts.driver;
        const driverOptions = opts.driver.getOptions(Model);
        this.$schema = this._buildSchema({
            querySchema: opts.querySchema || driverOptions.querySchema || this.constructor.$defaultSchema,
            $select: opts.$select || driverOptions.$select,
            $sort: opts.$sort || opts.$select || driverOptions.$select,
            $expand: opts.$expand || driverOptions.$expand
        });
    }

    /**
     * Apply the restified query to the querybuilder
     *
     * @param queryBuilder
     * @param query
     * @returns {queryBuilder}
     */
    apply(queryBuilder, query) {
        const restifyQuery = this.parse(query);
        return this.$driver.apply(queryBuilder, restifyQuery);
    }
    _buildSchema(opts) {
        let schema = cloneDeep(opts.querySchema);
        if (opts.$select) schema.properties.$select.items.enum = opts.$select;
        if (opts.$sort) schema.properties.$sort.items.enum = opts.$sort.reduce((prev, current) => prev.concat([`+${current}`, `-${current}`]), []);
        if (opts.$expand) schema.properties.$expand.items.enum = opts.$expand;
        return schema;
    }
    parse(query = {}) {
        if (query.$select) query.$select = query.$select.split(',');
        if (query.$expand) query.$expand = query.$expand.split(',');
        if (query.$sort) query.$sort = query.$sort.split(',');
        let valid = this.$validator(query);
        if (!valid) throw Schema.validationError(this.$validator.errors, this.$schema, 'Invalid query parameters', query);
        return {
            filter: this._convertFilter(query.$filter),
            sort: query.$sort,
            offset: query.$skip,
            limit: query.$top,
            expand: query.$expand,
            expandSelect: this._convertExpandSelect(query.$expand, query),
            select: query.$select,
            count: query.$count
        };
    }
    _convertExpandSelect($expand, query) {
        if (!$expand) return null;
        let expandedSelect = {};
        $expand.forEach((relation) => {
            let k = `$select[${relation}]`;
            if (query[k]) expandedSelect[relation] = query[k].split(',');
        });
        return expandedSelect;
    }
    _convertFilter($filter) {
        return undefined;
    }
}