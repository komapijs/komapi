// Exports
export default (request) => {
    Object.defineProperty(request, 'auth', {
        get() {
            if (this._passport) {
                return this[this._passport.instance._userProperty];
            }
            return null;
        },
    });
    return request;
};
