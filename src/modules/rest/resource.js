'use strict';

// Dependencies
import _ from 'lodash';
import Parser from './parser';

// Init
const defaultOpts = {
    columns: null,
    relations: null,
    maxRelations: 10,
    maxColumns: 50
};

// Exports
export default class Resource {

    /**
     * Create a new rest resource
     *
     * @param {Model.} Model
     * @param {Object=} opts
     * @param {Komapi} app
     */
    constructor(Model, opts = {}, app) {
        this.Model = Model;
        this.options = _.defaultsDeep({}, {
            columns: this.Model.getAllColumns(opts.columns)
        }, opts, {
            relations: (this.Model.relationMappings) ? Object.keys(this.Model.relationMappings) : null
        }, defaultOpts);
        this.parser = new Parser(this);
        this.app = app;
    }
    read() {
        return this.app.mw.route((router) => {
            router.get('/', (ctx) => {
                return this.Model.query()
                    .limit(10)
                    .restifyFilter(this.parser.parse(ctx.request.query))
                    .withMeta('full')
                    .then(ctx.send);
            });
            return router;
        });
    }
}