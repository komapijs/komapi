'use strict';

// Exports
export default (app) => {
    return {
        setHeader: function setHeader(...args) {
            return this.set(...args);
        }
    };
};