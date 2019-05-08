// Imports
import { VError } from 'botched';

// Exports
export default function isMultiError(error: Error): error is VError.MultiError {
  return 'errors' in error && typeof (error as VError.MultiError ).errors === 'function';
}
