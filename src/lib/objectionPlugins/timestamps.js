'use strict';

// Exports
export default (BaseModel) => {
    class Model extends BaseModel {
        $beforeValidate(...args) {
            const schema = super.$beforeValidate(...args);
            if (this.constructor.timestamps && schema && schema.properties) {
                if (this.constructor.camelCase && (!schema.properties.createdAt || !schema.properties.updatedAt)) throw new Error(`Invalid jsonSchema for model '${this.constructor.name}'. Add 'createdAt' and 'updatedAt' to the schema to use timestamps`);
                else if (!this.constructor.camelCase && (!schema.properties.created_at || !schema.properties.updated_at)) throw new Error(`Invalid jsonSchema for model '${this.constructor.name}'. Add 'created_at' and 'updated_at' to the schema to use timestamps`);
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