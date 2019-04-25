// Imports
import BaseVError, { VError } from 'verror';

// Types
export interface KomapiVErrorInfo extends BaseVError.Info {
  id?: string;
  code?: string;
  meta?: object;
}
export interface KomapiVErrorOptions extends BaseVError.Options {
  info: KomapiVErrorInfo;
}

// Exports
export class KomapiVError extends VError {
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
