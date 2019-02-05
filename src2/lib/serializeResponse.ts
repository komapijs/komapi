// Dependencies
import Koa from 'koa';
import defaultsDeep from 'lodash.defaultsdeep';

// Types
export interface SerializeResponseOptions {
  includeBody: boolean | ((request: Koa.Response) => boolean);
}
// Init
const defaultOptions: SerializeResponseOptions = {
  includeBody: response => response.status >= 400 && response.status !== 404,
};

// Exports
export default function serializeResponseFactory(options: Partial<SerializeResponseOptions> = {}) {
  const opts = defaultsDeep({}, options, defaultOptions);
  return function serializeRequest(response: Koa.Response) {
    const includeBody = typeof opts.includeBody === 'function' ? opts.includeBody(response) : opts.includeBody;
    return {
      body: includeBody ? response.body : undefined,
      status: response.status,
      header: response.header,
      length: response.length,
      type: response.type,
    };
  };
}
