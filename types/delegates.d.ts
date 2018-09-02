// Type definitions for delegates 1.0.0
// TypeScript Version: 2.8.3

declare module 'delegates' {
  export interface Delegator<T, U> {
    access: (property: keyof U) => any;
    method: (method: keyof U) => any;
  }
  export default function delegates<T, U>(proto: T, accessor: string): Delegator<T, U>;
}
