'use strict';

// Exports
export default (Model) => {

    // Query builder
    class QueryBuilder extends Model.QueryBuilder {
        constructor(modelClass) {
            super(modelClass);
            this._softDeleteProperty = modelClass.camelCase ? 'deletedAt' : 'deleted_at';
            if (modelClass.softDelete) {
                this.onBuild(builder => {
                    if (!builder.context().withArchived) builder.whereNull(this._softDeleteProperty);
                });
            }
        }
    }

    // RelatedQuery builder
    class RelatedQueryBuilder extends Model.RelatedQueryBuilder {
        constructor(modelClass) {
            super(modelClass);
            this._softDeleteProperty = modelClass.camelCase ? 'deletedAt' : 'deleted_at';
            if (modelClass.softDelete) {
                this.onBuild(builder => {
                    if (!builder.context().withArchived) {
                        builder.whereNull(this._softDeleteProperty);
                    }
                });
            }
        }
    }

    // Extend
    QueryBuilder.prototype.forceDelete = QueryBuilder.prototype.delete;
    RelatedQueryBuilder.prototype.forceDelete = RelatedQueryBuilder.prototype.delete;
    QueryBuilder.prototype.withArchived = RelatedQueryBuilder.prototype.withArchived = withArchived;
    QueryBuilder.prototype.delete = RelatedQueryBuilder.prototype.delete = del;
    QueryBuilder.prototype.softDelete = RelatedQueryBuilder.prototype.softDelete = softDelete;
    QueryBuilder.prototype.restore = RelatedQueryBuilder.prototype.restore = restore;

    Model.QueryBuilder = QueryBuilder;
    Model.RelatedQueryBuilder = RelatedQueryBuilder;

    return Model;
};

// Functions
function withArchived(withArchived = true) {
    this.context().withArchived = withArchived;
    return this;
}
function del(opts = {}) {
    if (this._modelClass.softDelete && !opts.force) return this.softDelete();
    return this.forceDelete();
}
function softDelete() {
    return this.patch({
        [this._softDeleteProperty]: new Date().toISOString()
    });
}
function restore() {
    this.withArchived(true);
    return this.patch({
        [this._softDeleteProperty]: null
    });
}