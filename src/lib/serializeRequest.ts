// Dependencies
import Komapi from './Komapi';
import Koa from 'koa';
import sanitize from './sanitize';
import { defaultsDeep } from 'lodash';

// Types
export interface SerializeRequestOptions {
  includeBody: boolean | ((request: Koa.Request) => boolean);
}
// Init
const defaultOptions: SerializeRequestOptions = {
  includeBody: request => request.ctx.response.status === 500,
};

// Exports
export default function serializeRequestFactory(options: Partial<SerializeRequestOptions> = {}) {
  const opts = defaultsDeep({}, options, defaultOptions);
  return function serializeRequest(request: Koa.Request): Komapi.SanitizedRequest {
    const includeBody = typeof opts.includeBody === 'function' ? opts.includeBody(request) : opts.includeBody;
    return {
      requestId: request.requestId,
      body: includeBody ? sanitize((request as { body?: any }).body) : undefined,
      headers: Object.assign({}, request.header, {
        authorization: request.header.authorization ? `${request.header.authorization.split(' ')[0]} ****` : undefined,
      }),
      method: request.method,
      protocol: request.protocol,
      url: request.url,
      query: sanitize(request.query),
      ip: request.ip,
      referrer: request.header.referer || request.header.referrer,
      userAgent: request.header['user-agent'],
      httpVersion: request.req.httpVersion,
      trailers: request.req.trailers,
    };
  };
}
