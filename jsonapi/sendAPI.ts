// Imports
import Koa from 'koa';
import { Document } from 'jsonapi-typescript';
import Schema from './Schema';
import jsonSchema from '../schemas/jsonapi.json';
import jsonV6Schema from 'ajv/lib/refs/json-schema-draft-06.json';

// Init
const schema = new Schema();
schema.addMetaSchema(jsonV6Schema);
const validator = schema.createValidator(jsonSchema);

// Exports
export default function sendAPI(this: Pick<Koa.BaseResponse, 'body' | 'set'>, data?: Document | null) {
  this.body = data ? validator(data) : data;
  this.set({
    'Content-Type': 'application/vnd.api+json',
  });
}
