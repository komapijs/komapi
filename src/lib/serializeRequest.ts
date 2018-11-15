// Dependencies
import Koa from 'koa';
import defaultsDeep from 'lodash.defaultsdeep';

// Types
export interface SerializeRequestOptions {
  includeBody: boolean | ((request: Koa.Request) => boolean);
}
// Init
const defaultOptions: SerializeRequestOptions = {
  includeBody: request => request.ctx.response.status >= 400 && request.ctx.response.status !== 404,
};

// Exports
export default function serializeRequestFactory(options: Partial<SerializeRequestOptions> = {}) {
  const opts = defaultsDeep({}, options, defaultOptions);
  return function serializeRequest(request: Koa.Request) {
    const includeBody = typeof opts.includeBody === 'function' ? opts.includeBody(request) : opts.includeBody;
    return {
      requestId: request.requestId,
      body: includeBody ? (request as { body?: any }).body : undefined,
      header: request.header,
      method: request.method,
      protocol: request.protocol,
      url: request.url,
      query: request.query,
      ip: request.ip,
      referrer: request.header.referer || request.header.referrer,
      userAgent: request.header['user-agent'],
      httpVersion: request.req.httpVersion,
      trailers: request.req.trailers,
    };
  };
}
