'use strict';

// Dependencies
import Joi from 'joi';
import uuid from 'node-uuid';

// Exports
export function createDatabase(bookshelfInstance, opts = {}) {
    return bookshelfInstance.knex.schema.createTable('test', (table) => {
        if (opts.uuidPrimaryKey) table.uuid('id').primary();
        else table.increments('id').primary();
        table.string('name');
        table.integer('num');
        table.timestamps();
    }).then(() => {
        if (opts.seed) {
            let rows = [];
            for (let i = 1; i <= opts.seed; i++) {
                let row = {
                    name: `name-${i}`,
                    num: i
                };
                if (opts.uuidPrimaryKey) row.id = uuid.v4('id');
                rows.push(row);
            }
            return bookshelfInstance.knex.batchInsert('test', rows);
        }
    });
}
export function models(bookshelfInstance, opts = {}) {
    let obj = {
        tableName: 'test',
        visible: opts.visible,
        hidden: opts.hidden
    };
    if (opts.schema === 1) obj.schema = Joi.object({
        name: Joi.string().min(1).required(),
        num: Joi.number().min(3).optional()
    });
    else if (opts.schema === 2) obj.schema = {
        name: Joi.string().min(1).required(),
        num: Joi.number().min(3).optional()
    };
    if (opts.uuidPrimaryKey) obj.uuidPrimaryKey = true;
    if (opts.timestamps) obj.hasTimestamps = true;
    let test = bookshelfInstance.Model.extend(obj);
    return bookshelfInstance.model('Test', test);
}