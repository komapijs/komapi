// Dependencies
import Koa from 'koa';
import sanitize from './sanitize';

// Types
interface ISanitizedResponse extends Pick<Koa.Response, 'status' | 'headers' | 'length' | 'type'> {
  body?: string;
}

// Exports
export { ISanitizedResponse };
export default function responseSerializer(response: Koa.Response): ISanitizedResponse {
  return {
    status: response.status,
    headers: response.headers,
    length: response.length,
    type: response.type,
    body: [400, 500].includes(response.status) ? sanitize(response.body) : undefined,
  };
}
