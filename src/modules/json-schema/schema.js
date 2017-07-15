// Dependencies
import Ajv from 'ajv';
import { defaultsDeep, map, pick } from 'lodash';
import { badRequest as BadRequest } from 'boom';
import draft04Schema from 'ajv/lib/refs/json-schema-draft-04.json';

// Init
const defaultOpts = {
  allErrors: true,
  verbose: true,
  messages: true,
  jsonPointers: true,
  format: 'full',
};
const mapping = {
  enum: (err, desc) => {
    const out = Object.assign({}, desc);
    out.allowedValues = err.schema;
    return out;
  },
  required: (err, desc) => {
    const out = Object.assign({}, desc);
    out.path += `/${err.params.missingProperty}`;
    out.message = 'should be present';
    out.data = null;
    return out;
  },
};

// Exports
export default class Schema extends Ajv {
  constructor(opts) {
    super(defaultsDeep(defaultOpts, opts));
    this.addMetaSchema(draft04Schema);
  }
  static validationError(errors, schema, message, data) {
    const msg = message || ((data) ? 'Invalid data provided' : 'No data provided');
    const keys = ['path', 'keyword', 'message', 'data', 'allowedValues'];
    const err = new BadRequest(msg);
    err.$schema = schema;
    err.errors = (data && errors) ? map(errors, error => this.$getDescriptiveError(error)) : [];
    err.output.payload.errors = map(err.errors, error => pick(error, keys));
    return err;
  }
  static $getDescriptiveError(error) {
    let descriptiveError = {
      path: error.dataPath,
      keyword: error.keyword,
      message: error.message,
      data: error.data,
    };
    if (mapping[error.keyword]) descriptiveError = mapping[error.keyword](error, descriptiveError);
    descriptiveError.metadata = Object.assign({}, error);
    if (error.parentSchema && error.parentSchema.message) {
      descriptiveError.allowedValues = undefined;
      descriptiveError.message = error.parentSchema.message;
    }
    return descriptiveError;
  }
}
