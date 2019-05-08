// Imports
import Komapi from '../lib/Komapi';
import { createHttpError, HttpError, NotFound, VError } from 'botched';

// Types
export interface JSONAPIError {
  id?: string;
  code?: string;
  status?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  links?: { about: string | { href: string; meta?: object; } };
  meta?: object;
}
interface JSONAPIErrorResponse {
  errors: JSONAPIError[];
}

// Exports
export default function createErrorHandler(): Komapi.Middleware {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
      if (ctx.status === 404) throw new NotFound();
    } catch (err) {
      const data = err.data || VError.info(err);
      const error = err instanceof HttpError ? err : createHttpError(err.statusCode || err.status || data.statusCode || data.status || 500, { cause: err }, 'An internal server error occurred');
      const jsonApiErrors: JSONAPIError[] = err.errors ? err.errors().map((e: Error) => new HttpError(e, e.message).toJSON()) : [error.toJSON()];
      const status = error.statusCode;
      const headers = error.headers;

      // Set default response (we assume JSON:API by default)
      let body: JSONAPIErrorResponse | string = { errors: jsonApiErrors };

      // Let figure out what content type we should respond with, but don't spend to much energy on
      // supporting multiple content types and always default to JSON
      const contentType = ctx.accepts(['application/vnd.api+json', 'json', 'html', 'text']);

      // HTML?
      if (contentType === 'html') {
        body = `<!doctype html><html lang=en><head><meta charset=utf-8><title>${
          error.title
        }</title></head><body><h1>${error.detail || error.title}</h1><pre>${JSON.stringify(
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

      // Emit errors for server errors
      if (error.isServer) ctx.app.emit('error', error, ctx);
    }
  };
}
