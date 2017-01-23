// Dependencies
import Service from '../../../src/modules/service/providers/rest';
import RestifyParser from '../../../src/modules/restify/parser';

// Exports
module.exports = class RestService extends Service {
  get $querySchema() { // eslint-disable-line class-methods-use-this
    return RestifyParser.$defaultSchema;
  }
  find(params) { // eslint-disable-line class-methods-use-this
    return {
      method: 'find',
      args: { params },
    };
  }
  get(stringId, params) { // eslint-disable-line class-methods-use-this
    const id = Number(stringId);
    if (id === 2) return null;
    return {
      method: 'get',
      args: {
        id,
        params,
      },
    };
  }
  create(data, params) { // eslint-disable-line class-methods-use-this
    return {
      method: 'create',
      args: {
        data,
        params,
      },
    };
  }
  update(stringId, data, params) { // eslint-disable-line class-methods-use-this
    const id = Number(stringId);
    return {
      method: 'update',
      args: {
        id,
        data,
        params,
      },
    };
  }
  patch(stringId, data, params) { // eslint-disable-line class-methods-use-this
    const id = Number(stringId);
    return {
      method: 'patch',
      args: {
        id,
        data,
        params,
      },
    };
  }
  delete() { // eslint-disable-line class-methods-use-this
    return null;
  }
};
