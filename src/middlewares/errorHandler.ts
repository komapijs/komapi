// Imports
import Boom from 'boom';
import { VError } from 'verror';
import Komapi from '../lib/Komapi';
import isMultiError from '../lib/isMultiError';

// Types
interface JSONAPIError {
  id?: string;
  code?: string;
  status?: string;
  title?: string;
  detail?: string;
  meta?: object;
}
interface JSONAPIErrorResponse {
  errors: JSONAPIError[];
}
interface ErrorWithOptionalData extends Error {
  data?: any;
}

// Helpers
function createJsonApiErrors(error: Error): JSONAPIError[] {
  return normalizeError(error).map(serializeJsonApiError);
}
function normalizeError(error: Error): Error[] {
  return isMultiError(error) ? error.errors() : [error];
}
function serializeJsonApiError(unserializedError: ErrorWithOptionalData): JSONAPIError {
  const error = Boom.boomify(unserializedError);
  const data = error.data || VError.info(error);
  return {
    id: data.id,
    code: data.code,
    status: error.output.statusCode.toString(),
    title: error.output.payload.error,
    detail: error.output.payload.message,
    meta: data.meta,
  };
}

// Exports
export default function errorHandlerMiddlewareFactory(): Komapi.Middleware {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
      if (ctx.status === 404) throw Boom.notFound();
    } catch (err) {
      // HTTP Friendly error
      const errInfo = VError.info(err);
      const error = Boom.boomify(err, {
        statusCode: err.statusCode || err.status || errInfo.statusCode || errInfo.status || undefined,
      });
      const errors = createJsonApiErrors(error);
      const status = error.output.statusCode;
      const headers = error.output.headers;

      // Set default response (we assume JSON:API by default)
      let body: JSONAPIErrorResponse | string = { errors };

      // Let's try to figure out what content type we should respond with, but don't spend to much energy on
      // supporting multiple content types and always default to JSON
      const contentType = ctx.accepts(['application/vnd.api+json', 'json', 'html', 'text']);

      // HTML?
      if (contentType === 'html') {
        body = `<!doctype html><html lang=en><head><meta charset=utf-8><title>${
          error.output.payload.error
        }</title></head><body><h1>${error.output.payload.message}</h1><pre>${JSON.stringify(
          body,
          undefined,
          2,
        )}</pre></body></html>`;
      }
      // Text?
      else if (contentType === 'text') {
        body = JSON.stringify(body, undefined, 2);
      }

      // Respond
      ctx.set(headers);
      ctx.status = status;
      ctx.body = body;
    }
  };
}
