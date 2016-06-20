'use strict';

// Exports
export default (Bookshelf) => {
    const Model = Bookshelf.Model;
    Bookshelf.Model = Model.extend({
        triggerThen: function triggerThen() {
            let args = arguments;
            return Model.prototype.triggerThen.apply(this, arguments)
                .then(() => {
                    if (args[0] === 'creating saving') {
                        args[0] = 'post-creating post-saving';
                        return Model.prototype.triggerThen.apply(this, args);
                    }
                    else if (args[0] === 'updating saving') {
                        args[0] = 'post-updating post-saving';
                        return Model.prototype.triggerThen.apply(this, args);
                    }
                });
        }
    });
};