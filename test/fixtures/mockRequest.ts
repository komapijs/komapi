// Exports
import Koa from 'koa';
import { defaultsDeep } from 'lodash';
import Komapi from '../../src/lib/Komapi';

export default function mockRequest(
  requestProperties?: Partial<Koa.Request & { body: any }>,
  responseProperties?: Partial<Koa.Response>,
): { request: Koa.Request & { body?: any }; response: Koa.Response } {
  const app = new Komapi();
  const req = {};
  const res = {};
  const request = defaultsDeep({ req, res }, requestProperties, {
    app,
    ctx: {},
    header: {
      'cache-control': 'no-cache',
    },
    query: {},
  });

  const response = defaultsDeep({ req, res }, responseProperties, {
    ctx: {},
    status: 200,
  });

  // Add references
  Object.defineProperty(request, 'response', { get: () => response });
  Object.defineProperty(request.ctx, 'response', { get: () => response });
  Object.defineProperty(request.ctx, 'request', { get: () => request });
  Object.defineProperty(response, 'request', { get: () => request });
  Object.defineProperty(response.ctx, 'request', { get: () => request });
  Object.defineProperty(response.ctx, 'response', { get: () => response });

  // Return mocked request response
  return { request, response };
}
