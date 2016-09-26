'use strict';

// Exports
export default (context) => {
    Object.assign(context, {
        send: function send(body, status, headers) {
            this.body = body;
            if (status) this.status = status;
            if (headers) this.set(headers);
            return this.body;
        },

        /**
         *
         * @param body {mixed=}
         * @param status {integer=}
         * @param headers {mixed=}
         * @param override {bool=} Optional bool to override body evaluation. Useful when adding metadata
         * @returns {*}
         */
        sendIf: function sendIf(body, status, headers, override) {
            if ((override != undefined && override) || (override == undefined && body)) {
                this.body = body;
                if (status) this.status = status;
                if (headers) this.set(headers);
                return this.body;
            }
        }
    });
    return context;
};