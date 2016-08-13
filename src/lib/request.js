'use strict';

// Exports
export default (request) => {
    Object.defineProperty(request, 'auth', {
        get: function() {
            if (this._passport) {
                return this[this._passport.instance._userProperty];
            }
            else return null;
        }
    });
    return request;
};