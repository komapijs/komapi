'use strict';

// Dependencies
import Service from '../../../src/modules/service/providers/rest';

// Exports
module.exports = class RestService extends Service {
    find(params) {
        return {
            method: 'find',
            args: {
                params: params
            }
        };
    }
    get(id, params) {
        id = parseInt(id, 10);
        if (id === 2) return null;
        return {
            method: 'get',
            args: {
                id: id,
                params: params
            }
        };
    }
    create(data, params) {
        return {
            method: 'create',
            args: {
                data: data,
                params: params
            }
        };
    }
    update(id, data, params) {
        id = parseInt(id, 10);
        return {
            method: 'update',
            args: {
                id: id,
                data: data,
                params: params
            }
        };
    }
    patch(id, data, params) {
        id = parseInt(id, 10);
        return {
            method: 'patch',
            args: {
                id: id,
                data: data,
                params: params
            }
        };
    }
    delete() {
        return null;
    }
};