// Imports
import { WError } from 'verror';
import { KomapiVErrorOptions } from './VError';

// Types

// Exports
export class KomapiWError extends WError {
  /**
   * Using "verror" - just extended with optional types that are used for error handling and api response
   * @see https://github.com/joyent/node-verror
   */
  constructor(message?: string, ...params: any[]);
  constructor(options: KomapiVErrorOptions | Error, message: string, ...params: any[]);
  constructor(...args: any[]) {
    super(...args);
  }
}
