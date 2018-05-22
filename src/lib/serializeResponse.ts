// Dependencies
import Komapi from './Komapi';
import Koa from 'koa';
import sanitize from './sanitize';
import { defaultsDeep } from 'lodash';

// Types
export interface SerializeResponseOptions {
  includeBody: boolean | ((response: Koa.Response) => boolean);
}
// Init
const defaultOptions: SerializeResponseOptions = {
  includeBody: response => response.status === 400 || response.status === 500,
};

// Exports
export default function serializeResponseFactory(options: Partial<SerializeResponseOptions> = {}) {
  const opts = defaultsDeep({}, options, defaultOptions);
  return function serializeResponse(response: Koa.Response): Komapi.SanitizedResponse {
    const includeBody = typeof opts.includeBody === 'function' ? opts.includeBody(response) : opts.includeBody;
    return {
      status: response.status,
      headers: response.headers,
      length: response.length,
      type: response.type,
      body: includeBody ? sanitize(response.body) : undefined,
    };
  };
}
