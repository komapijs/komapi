// Imports
import { botch, NotFound, VError } from 'botched';
import Komapi from '../lib/Komapi';

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
  links?: { about: string | { href: string; meta?: object } };
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
      const error = botch(err);
      const jsonApiErrors = typeof err.errors === 'function' ? (err as VError.MultiError).errors().map(botch) : [error];

      // Get headers and status code from error
      const { detail, headers, isServer, statusCode, title } = error;

      // Set default response (we assume JSON:API by default)
      let body: JSONAPIErrorResponse | string = { errors: jsonApiErrors.map(e => e.toJSON()) };

      // Let figure out what content type we should respond with, but don't spend to much energy on
      // supporting multiple content types and always default to JSON
      const contentType = ctx.accepts(['application/vnd.api+json', 'json', 'html', 'text']);

      // HTML?
      if (contentType === 'html') {
        body = `<!doctype html><html lang=en><head><meta charset=utf-8><title>${title}</title></head><body><h1>${detail ||
          title}</h1><pre>${JSON.stringify(body, undefined, 2)}</pre></body></html>`;
      }
      // Text?
      else if (contentType === 'text') {
        body = JSON.stringify(body, undefined, 2);
      }

      // Respond
      ctx.set(headers);
      ctx.status = statusCode;
      ctx.body = body;

      // Emit errors for server errors
      if (isServer) ctx.app.emit('error', error, ctx);
    }
  };
}
