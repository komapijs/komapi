// Dependencies
import { isPlainObject, mapValues } from 'lodash';

// Sensitive props
const safeString = '[REDACTED]';
const patterns: RegExp[] = [/secrets?/i, /passw?(ord)?s?/i, /credit-?cards?/i, /tokens?/i];

// Exports
export default function sanitize(dirty: any, shouldSanitize: boolean = false): any {
  // Object?
  if (isPlainObject(dirty)) {
    return mapValues(dirty, (v, k) => {
      if (isPlainObject(v)) return sanitize(v);

      // Is sensitive key?
      const shouldSanitizeValue = patterns.some(p => !!k.match(p));
      if (Array.isArray(v)) return v.map(sv => sanitize(sv, shouldSanitizeValue));
      return sanitize(v, shouldSanitizeValue);
    });
  }

  // Array?
  if (Array.isArray(dirty)) {
    return dirty.map(sv => sanitize(sv));
  }

  // Return final value
  return shouldSanitize ? safeString : dirty;
}
