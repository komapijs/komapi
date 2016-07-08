'use strict';

// Exports
export default (BaseModel) => {
    class Model extends BaseModel {
        $toDatabaseJson() {
            const jsonSchema = this.constructor.jsonSchema;
            const pick = jsonSchema && jsonSchema.properties;
            let omit;

            if (!pick) {
                omit = this.constructor.getRelations();
            }
            else {
                if (this.constructor.camelCase) {
                    pick.createdAt = pick.updatedAt = {
                        type: 'string',
                        format: 'date-time'
                    };
                }
                else {
                    pick.created_at = pick.updated_at = {
                        type: 'string',
                        format: 'date-time'
                    };
                }
            }
            return this.$$toJson(true, omit, pick);
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