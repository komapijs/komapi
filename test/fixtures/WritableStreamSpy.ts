// Imports
import { Writable } from 'stream';

// Exports
export default class WritableStreamSpy extends Writable {
  public constructor(cb = () => true) {
    super();
    this.writable = true;
    this.write = cb;
  }
}
