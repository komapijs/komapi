// Exports
export default (BaseModel) => {
    class Model extends BaseModel {
        static get timestampColumns() {
            if (!this.timestamps) return [];
            return (this.camelCase) ? ['createdAt', 'updatedAt'] : ['created_at', 'updated_at'];
        }
        static get systemColumns() {
            const systemColumns = super.systemColumns;
            return systemColumns.concat(this.timestampColumns);
        }
        $toDatabaseJson() {
            const jsonSchema = this.constructor.jsonSchema;
            const pick = jsonSchema && jsonSchema.properties;
            let omit;

            if (!pick) omit = this.constructor.getRelations();
            else {
                this.constructor.timestampColumns.forEach((column) => {
                    jsonSchema.properties[column] = {
                        type: 'string',
                        format: 'date-time',
                    };
                });
            }
            return this.$$toJson(true, omit, pick);
        }
        $beforeInsert(...args) {
            if (this.constructor.timestamps) {
                const datetime = new Date().toISOString();
                this.constructor.timestampColumns.forEach(column => (this[column] = datetime));
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
