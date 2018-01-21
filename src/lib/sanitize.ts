// Dependencies
import { cloneDeep } from 'lodash';

// Exports
export default function sanitize(dirty?: any) {
  if (dirty && typeof dirty === 'object') {
    const clean: { [key: string]: any } = cloneDeep(dirty);
    ['secret', 'password', 'creditCard', 'credit-card', 'token'].forEach(k => {
      if (clean.hasOwnProperty(k)) clean[k] = '****';
    });
    return clean;
  }
  return dirty;
}
