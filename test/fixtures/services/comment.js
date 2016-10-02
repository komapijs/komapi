// Dependencies
import Service from '../../../src/modules/service/providers/rest';

// Exports
module.exports = class CommentService extends Service {
    get $dataSchema() { // eslint-disable-line class-methods-use-this
        return {
            $schema: 'http://json-schema.org/draft-04/schema#',
            title: 'Test Schema',
            type: 'object',
            properties: {
                prop: {
                    description: 'Dummy prop',
                    type: 'integer',
                },
                prop2: {
                    description: 'Dummy prop2',
                    type: 'integer',
                },
            },
        };
    }
    find(params) { // eslint-disable-line class-methods-use-this
        return params;
    }
    get(id) { // eslint-disable-line class-methods-use-this
        return id;
    }
    create(data) { // eslint-disable-line class-methods-use-this
        return data;
    }
    update(id, data) { // eslint-disable-line class-methods-use-this
        return data;
    }
    patch(id, data) { // eslint-disable-line class-methods-use-this
        return data;
    }
};
