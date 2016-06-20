'use strict';

// Dependencies
import uuid from 'node-uuid';

// Exports
export default (Bookshelf) => {
    const Model = Bookshelf.Model;
    Bookshelf.Model = Model.extend({
        initialize: function initialize() {
            Model.prototype.initialize.apply(this, arguments);
            if (this.uuidPrimaryKey) {
                this.on('post-creating', (model) => {
                    model.set(model.idAttribute, uuid.v4());
                });
            }
        }
    });
};