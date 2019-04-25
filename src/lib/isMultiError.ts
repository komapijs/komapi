// Imports
import { MultiError } from 'verror';

// Exports
export default function isMultiError(error: Error): error is MultiError {
  return 'errors' in error && typeof (error as MultiError).errors === 'function';
}
