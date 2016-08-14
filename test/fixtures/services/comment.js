'use strict';

// Dependencies
import Service from '../../../src/modules/service/providers/rest';

// Exports
module.exports = class CommentService extends Service {
    get $dataSchema() {
        return {
            $schema: 'http://json-schema.org/draft-04/schema#',
            title: 'Test Schema',
            type: 'object',
            properties: {
                prop: {
                    description: 'Dummy prop',
                    type: 'integer'
                },
                prop2: {
                    description: 'Dummy prop2',
                    type: 'integer'
                }
            }
        };
    }
    get $querySchema() {
        return null;
    }
    find(params) {
        return params;
    }
    get(id) {
        return id;
    }
    create(data) {
        return data;
    }
    update(id, data) {
        return data;
    }
    patch(id, data) {
        return data;
    }
};