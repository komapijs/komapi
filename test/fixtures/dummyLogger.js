// Dependencies
import Stream from 'stream';

// Exports
export default class DummyLogger extends Stream {
    constructor(cb) {
        super();
        this.stream = new Stream();
        this.writable = true;
        this.write = cb;
    }
}
