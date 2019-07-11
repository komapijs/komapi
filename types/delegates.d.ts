// Type definitions for delegates 1.0.0
// TypeScript Version: 3.3.1

declare module 'delegates' {
  export interface Delegator<T, U> {
    access: (property: keyof U) => Delegator<T, U>;
    method: (method: keyof U) => Delegator<T, U>;
  }
  export default function delegates<T, U>(proto: T, accessor: string): Delegator<T, U>;
}
