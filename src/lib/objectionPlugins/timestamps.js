'use strict';

// Exports
export default (BaseModel) => {
    class Model extends BaseModel {
        $toDatabaseJson() {
            const omit = this.constructor.getRelations();
            return this.$$toJson(true, omit, null);
        }
        $beforeValidate(jsonSchema, json, opt) {
            const schema = super.$beforeValidate(jsonSchema, json, opt);
            if (this.constructor.timestamps && schema && schema.properties) {
                if (this.constructor.camelCase) {
                    jsonSchema.properties.createdAt = jsonSchema.properties.updatedAt = {
                        type: 'string',
                        format: 'date-time'
                    };
                }
                else {
                    jsonSchema.properties.created_at = jsonSchema.properties.updated_at = {
                        type: 'string',
                        format: 'date-time'
                    };
                }
            }
            return schema;
        }
        $beforeInsert(...args) {
            if (this.constructor.timestamps) {
                const datetime = new Date().toISOString();
                if (this.constructor.camelCase) {
                    this.createdAt = datetime;
                    this.updatedAt = datetime;
                }
                else {
                    this.created_at = datetime;
                    this.updated_at = datetime;
                }
            }
            return super.$beforeInsert(...args);
        }

        $beforeUpdate(...args) {
            if (this.constructor.timestamps) {
                const datetime = new Date().toISOString();
                if (this.constructor.camelCase) this.updatedAt = datetime;
                else this.updated_at = datetime;
            }
            return super.$beforeUpdate(...args);
        }
    }
    return Model;
};