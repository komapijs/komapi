'use strict';

// Dependencies
import Joi from 'joi';
import _ from 'lodash';

// Exports
export default (Bookshelf) => {
    const Model = Bookshelf.Model;
    Bookshelf.Model = Model.extend({
        constructor: function constructor() {
            Model.prototype.constructor.apply(this, arguments);
            if (this.schema) {
                this.on('creating', this.validate, this);
                this.on('updating', this.validate, this);
            }
        },
        getSystemAttributes: function getSystemAttributes() {
            let attrs = [this.idAttribute];
            if (this.hasTimestamps) attrs.push('created_at', 'updated_at');
            if (this.softActivated) attrs.push('deleted_at', 'restored_at');
            return attrs;
        },
        validate: function validate(model, saveAttrs, opts) {
            let scope = this.attributes;
            let schema = this.schema;
            if (opts.patch) {
                scope = this.changed;
                if (schema.isJoi) schema = _.reduce(schema._inner.children, (result, value, key) => {
                    if (saveAttrs[value.key]) result[value.key] = value.schema;
                    return result;
                }, {});
                else schema = _.pick(schema, Object.keys(saveAttrs));
            }
            if (opts.disableValidation) return this.set(scope);
            scope = _.omit(scope, this.getSystemAttributes());

            let result = Joi.validate(scope, schema, {
                abortEarly: false
            });
            if (result.error) {
                result.error.data = scope;
                throw result.error;
            }
            return this.set(result.value);
        }
    });
};