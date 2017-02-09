// Functions
function withArchived(includeArchived = true) {
  this.context().withArchived = includeArchived;
  return this;
}
function del(opts = {}) {
  if (this._modelClass.softDelete && !opts.force) return this.softDelete();
  return this.forceDelete();
}
function softDelete() {
  return this.patch({
    [this._modelClass.softDeleteColumn]: new Date().toISOString(),
  });
}
function restore() {
  this.withArchived(true);
  return this.patch({
    [this._modelClass.softDeleteColumn]: null,
  });
}

// Exports
export default (BaseModel) => {
  // Model
  class Model extends BaseModel {
    static get softDeleteColumn() {
      if (!this.softDelete) return null;
      return (this.camelCase) ? 'deletedAt' : 'deleted_at';
    }
    static get systemColumns() {
      return (this.softDeleteColumn) ? [this.softDeleteColumn] : [];
    }
  }

  // Query builder
  class QueryBuilder extends Model.QueryBuilder {
    constructor(modelClass) {
      super(modelClass);
      if (modelClass.softDeleteColumn) {
        this.onBuild((builder) => {
          if (!builder.context().withArchived) builder.whereNull(modelClass.softDeleteColumn);
        });
      }
    }
  }

  // RelatedQuery builder
  class RelatedQueryBuilder extends Model.RelatedQueryBuilder {
    constructor(modelClass) {
      super(modelClass);
      if (modelClass.softDeleteColumn) {
        this.onBuild((builder) => {
          if (!builder.context().withArchived) {
            builder.whereNull(modelClass.softDeleteColumn);
          }
        });
      }
    }
  }

  // Extend
  QueryBuilder.prototype.forceDelete = QueryBuilder.prototype.delete;
  RelatedQueryBuilder.prototype.forceDelete = RelatedQueryBuilder.prototype.delete;
  QueryBuilder.prototype.withArchived = withArchived;
  RelatedQueryBuilder.prototype.withArchived = QueryBuilder.prototype.withArchived;
  QueryBuilder.prototype.delete = del;
  RelatedQueryBuilder.prototype.delete = QueryBuilder.prototype.delete;
  QueryBuilder.prototype.softDelete = softDelete;
  RelatedQueryBuilder.prototype.softDelete = QueryBuilder.prototype.softDelete;
  QueryBuilder.prototype.restore = restore;
  RelatedQueryBuilder.prototype.restore = QueryBuilder.prototype.restore;

  Model.QueryBuilder = QueryBuilder;
  Model.RelatedQueryBuilder = RelatedQueryBuilder;

  return Model;
};
