'use strict';

// Exports
export default (app) => {
    return {
        send: function send(body, status, headers) {
            this.body = body;
            if (status) this.status = status;
            if (headers) this.set(headers);
            return this.body;
        },
        sendIf: function sendIf(body, status, headers) {
            if (body) {
                this.body = body;
                if (status) this.status = status;
                if (headers) this.set(headers);
                return this.body;
            }
        }
    };
};