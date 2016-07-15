'use strict';

// Dependencies
import _ from 'lodash';
import Schema from '../../lib/schema';

// Init
const defaultSchema = {
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
Object.freeze(defaultSchema);
let schema = new Schema({
    useDefaults: true,
    coerceTypes: true
});

// Exports
export default class Parser {
    constructor(opts) {
        this.options = opts;
        this.schema = this._buildSchema();
        this.validator = schema.compile(this.schema);
    }
    _buildSchema() {
        if (this.options.querySchema) return this.options.querySchema;
        let schema = _.cloneDeep(defaultSchema);
        if (this.options.columns && this.options.columns.length > 0) {
            schema.properties.$select.items.enum = this.options.columns;
            schema.properties.$sort.items.enum = this.options.columns.reduce((prev, current) => prev.concat([current, `+${current}`, `-${current}`]), []);
        }
        if (this.options.relations) schema.properties.$expand.items.enum = this.options.relations;
        return schema;
    }
    parse(query) {
        if (query.$select) query.$select = query.$select.split(',');
        if (query.$expand) query.$expand = query.$expand.split(',');
        if (query.$sort) query.$sort = query.$sort.split(',');
        let valid = this.validator(query);
        if (!valid) throw Schema.parseValidationErrors(this.validator.errors, this.schema, 'Invalid query parameters', query);
        return {
            filter: query.$filter,
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
}