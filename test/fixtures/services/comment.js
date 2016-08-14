'use strict';

// Dependencies
import Service from '../../../src/modules/service/providers/rest';

// Exports
module.exports = class CommentService extends Service {
    get $dataSchema() {
        return {
            $schema: true
        };
    }
    get $querySchema() {
        return null;
    }
    find(id) {
        return id;
    }
};