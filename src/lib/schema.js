'use strict';

// Dependencies
import Ajv from 'ajv';

// Init
let ajv = new Ajv({
    messages: true
});
ajv.addKeyword('typeof', {
    compile: (schema) => {
        return function validate(data) {
            validate.errors = [{
                keyword: 'typeof',
                params: {
                    keyword: 'typeof'
                },
                message: `must be of type ${schema}.`
            }];
            return (typeof data === schema);
        };
    }
});

// Define schemas
ajv.addSchema({
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Komapi config',
    type: 'object',
    properties: {
        env: {
            description: 'Environment',
            type: 'string',
            enum: [
                'development',
                'production'
            ]
        },
        loggers: {
            description: 'List of loggers',
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    level: {
                        type: 'string'
                    },
                    stream: {
                        type: 'object'
                    }
                },
                required: [
                    'name',
                    'level',
                    'stream'
                ]
            },
            minItems: 0
        },
        name: {
            description: 'Application name',
            type: 'string'
        },
        proxy: {
            description: 'Trust proxy headers',
            type: 'boolean'
        },
        routePrefix: {
            description: 'Prefix for routes',
            type: 'string'
        },
        subdomainOffset: {
            description: 'Number of subdomains to ignore',
            type: 'integer'
        }
    },
    additionalProperties: false,
    required: [
        'env',
        'loggers',
        'name',
        'proxy',
        'routePrefix',
        'subdomainOffset'
    ]
}, 'komapi');
ajv.addSchema({
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Komapi:requestLogger config',
    type: 'object',
    properties: {
        logger: {
            description: 'Logger to use',
            typeof: 'function'
        }
    },
    additionalProperties: false
}, 'requestLogger');


// Exports
export default class Schema {
    static validate(schema, data) {
        let valid = ajv.validate(schema, data);
        if (!valid) throw new Error(ajv.errors.map((v) => `${schema}${v.dataPath} ${v.message}`).join(', '));
        return data;
    }
}