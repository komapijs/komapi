'use strict';

// Exports
export default (response) => {
    Object.assign(response, {
        setHeader: function setHeader(...args) {
            return this.set(...args);
        }
    });
    return response;
};