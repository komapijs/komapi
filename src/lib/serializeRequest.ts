// Dependencies
import Koa from 'koa';
import sanitize from './sanitize';

// Types
interface ISanitizedRequest extends Pick<Koa.Request, 'headers' | 'method' | 'protocol' | 'url' | 'query' | 'ip'> {
  body?: any;
  referrer: Koa.Request['header']['referer'] | Koa.Request['header']['referrer'];
  userAgent: Koa.Request['header']['user-agent'];
  httpVersion: Koa.Request['req']['httpVersion'];
  trailers: Koa.Request['req']['trailers'];
}

// Exports
export { ISanitizedRequest };
export default function requestSerializer(request: Koa.Request): ISanitizedRequest {
  return {
    body: request.ctx.response.status === 500 ? sanitize((request as { body?: any }).body) : undefined,
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
}
