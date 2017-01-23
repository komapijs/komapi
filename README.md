# KomAPI

Komapi is an opinionated Node.js framework built on top of Koa 2.0. 
 
Disclaimer: There will be breaking changes and outdated documentation during the pre-v1.0.0 cycles.

[![npm](https://img.shields.io/npm/v/komapi.svg)](https://npmjs.org/package/komapi)
[![Travis](https://img.shields.io/travis/komapijs/komapi/master.svg)](https://travis-ci.org/komapijs/komapi)
[![Codecov branch](https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg)](https://codecov.io/gh/komapijs/komapi)
[![David](https://img.shields.io/david/komapijs/komapi.svg)]()
[![npm](https://img.shields.io/npm/l/komapi.svg)](https://github.com/komapijs/komapi/blob/master/LICENSE.md)

Komapi is essentially Koa with some added sugar, which means that you can use any Koa compatible middleware and use the Koa documentation as reference. Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to override these with your own where necessary.

## Usage
- [Installation](#installation)
- [Configuration](#configuration)
- [Hello World](#hello-world)
- [Example Project Structure](#example-project-structure)
- [Routing](#routing)
  - [Route Modules](#route-modules)
    - [Example Route Modules](#example-route-module)
  - [Loading Route Modules](#loading-route-modules)
- [Logging](#logging)
- [Middleware](#middleware)
  - [Mounting Middleware](#mounting-middleware)
  - [Recommended Middleware](#recommended-middleware)
    - [Komapi Native Middleware](#komapi-native-middleware)
      - [app.mw.ensureSchema(schema, [key])](#komapi-middleware-ensureschema)
      - [app.mw.requestLogger([options])](#komapi-middleware-requestlogger)
- [Authentication](#authentication)     
- [ORM](#orm)
  - [Objection.js](#objectionjs)
    - [Objection Plugins](#objection-plugins)
      - [Soft Delete](#soft-delete)
      - [Timestamps](#timestamps)
      - [camelCase](#camelcase)
  - [Models](#models)
    - [Example Model](#example-model)
- [Optional Dependencies](#optional-dependencies)
  - [Database](#database)
- [Tips](#tips)
- [License](#license)
  
### Installation
Install through npm and require it in your `index.js` file.
```bash
$ npm install --save komapi
```

### Configuration
Komapi accepts a configuration object during instantiation

```js
const app = new Komapi({
  env: process.env.NODE_ENV, // Default: process.env.NODE_ENV || 'development'
  name: 'Name of application', // Default: 'Komapi application'
  loggers: [], // Default: [], Array of bunyan loggers. See the logging chapter for more information
  proxy: false, // Default: false, trust proxy headers such as X-Forwarded-For?
  routePrefix: '/', // Default: '/', Add a route prefix for all middlewares
  subdomainOffset: 2, // Default: 2, See the koa documentation on this setting
});
```

### Hello World
```js
// Dependencies
const Komapi = require('komapi');

// Init
const app = new Komapi();

// Middlewares
app.use((ctx) => {
    ctx.body = 'Hello World!';
});

// Listen
app.listen(process.env.PORT || 3000);
```

### Example Project Structure
The project structure is entirely up to you and your preferences, but is left here as a starting point and reference for examples.
```
app
`--migrations/
`--public/
`--src
|  |--lib/
|  |--middleware/
|  |--model/
|  |--route/
|  |--view/
`--test
|  |--lib/
|  |--middleware/
`--index.js
`--LICENSE.md
`--package.json
`--README.md
```

### Routing
#### Route Modules
Komapi encourages using separate files for routes and provides an easy to use way of creating decoupled routes. A Komapi route file is a module exporting a [koa-router](https://github.com/alexmingoia/koa-router/tree/master/) instance.
The route module is provided with an instance of [koa-router](https://github.com/alexmingoia/koa-router/tree/master/), and the app instance. The app instance is most often used for route specific middlewares as seen in the [authentication](#authentication) example.
Note that even though it is possible to return a different [koa-router](https://github.com/alexmingoia/koa-router/tree/master/) instance than the injected instance, it is recommended to use the provided instance for future proofing.

Komapi provides two helpful functions when creating routes, namely `ctx.send` and `ctx.sendIf`. These are bound to `ctx` which means that you can just add `.then(ctx.send)` to your promise chain to send the result. `ctx.sendIf` sends a 404 if your result is not truthy. This is particularly useful when requesting single resources in a REST API. 
##### Example Route Module
```js
// Export route
module.exports = (router, app) => {

  /**
   * GET /
   * Always replies: 200 "Hello World!"
   */
  router.get('/', (ctx) => ctx.body = 'Hello World!');
  
  return router;
};
```

#### Loading Route Modules
Route modules (or a collection of route modules) are loaded as a single middleware, encapsulating any middlewares specific to that group of route modules. A group of route modules refers to all route modules loaded at the same time. 
It is possible load a single route module by specifying the path to the route module with the extension `.js`, or recursively load every route module in a directory.
Route modules are loaded through:
```js
app.mw.route([middlewares ...], path)
```
This will return a middleware which can be mounted to the application as any other [middleware](#mounting-middleware).

All route modules will be mounted on a path relative to the provided `path`. This means that if the [Example Route Module](#example-route-model) above resides in `./src/route/v1/example.js`, it will respond `Hello World!` to the following endpoints, depending on how you load it:

| Loaded with | Endpoint |
| --- | --- |
| `app.mw.route('./src/route')` | `GET /v1/example` |
| `app.mw.route('./src/route/v1')` | `GET /example` |
| `app.mw.route('./src/route/v1/example.js')` | `GET /` |

### Logging
Komapi comes with [bunyan](https://github.com/trentm/node-bunyan/tree/master/) pre-configured, but without any loggers enabled. The [bunyan](https://github.com/trentm/node-bunyan/tree/master/) instance is available through `app.log`.
#### Logging setup
For most users, this will be sufficient. You can pass in the loggers you need in the Komapi configuration.

See the [bunyan](https://github.com/trentm/node-bunyan/tree/master/) documentation for more information how to configure logging.  
```js
// Dependencies
const Komapi = require('komapi');

// Init
const app = new Komapi({
  loggers: [
    {
      level: 'info',
      stream: process.stdout, // Log info-level (and above) to stdout
    },
    {
      level: 'error',
      stream: process.stderr, // Log error-level (and above) to stderr
    },
  ]
});

// Middlewares
app.use((ctx) => {
    ctx.body = 'Hello World!';
});

// Listen
app.listen(process.env.PORT || 3000);
};
```
  

### Middleware
#### Mounting Middleware
Middlewares are mounted the same way as in Koa using `app.use`, but it is also possible to mount multiple middlewares at the same time and at specific paths.
```js
app.use([mountAt], middlewares, [...]);
```

| Mounting middleware |
| --- |
| `app.use(middlewareFn)` |
| `app.use(middlewareFn1, middlewareFn2)` |
| `app.use([middlewareFn1, middlewareFn2])` |
| `app.use('/v1', middlewareFn)` |
| `app.use('/v1', middlewareFn1, middlewareFn2)` |
| `app.use('/v1', [middlewareFn1, middlewareFn2])` |

Example:
```js
app.use(app.mw.requestLogger());
```

#### Recommended Middleware
Komapi provides some built-in middlewares for most use cases. Some of these are just wrappers around existing Koa middleware, but provided for convenience and possible extensions/defaulting later on.

| Middleware | Description |
| --- | --- |
| [app.mw.ensureSchema](#komapi-middleware-ensureschema) | Validate requests according to JSON Schema |
| [app.mw.requestLogger](#komapi-middleware-requestlogger) | Log requests |
| [app.mw.route](#loading-route-modules) | Routing |
| [koa-bodyparser](https://github.com/koajs/bodyparser) | Parse request body into ctx.request.body |
| [koa-compress](https://github.com/koajs/compress) | Compress responses |
| [kcors](https://github.com/koajs/cors) | Set CORS (Cross-Origin Resource Sharing) headers |
| [koa-etag](https://github.com/koajs/etag) | Set ETags in responses |
| [koa-helmet](https://github.com/venables/koa-helmet) | Set security related response headers |
| [koa-static](https://github.com/koajs/static) | Serve static files |
| [koa-views](https://github.com/queckezz/koa-views) | Template rendering |

##### Komapi Native Middleware
<a name="komapi-middleware-ensureschema"></a>
###### app.mw.ensureSchema(schema[, opts])
* schema
* opts (optional)
* opts.key: (`body`, `params` or `query`) `default: body`
* opts.sendSchema: reply with the schema if this query parameter was set (only for `GET`). Alternatively provide a `function (ctx) {}` returning `true` or `false`. `default: $schema`.

Ensures request body (`ctx.request.body`) conforms to the provided JSON Schema. Note that `app.mw.bodyParser()` must be enabled before this to function. Can optionally validate a different key on the `ctx.request`. See [JSON Schema](http://json-schema.org/) for more information on how to create a schema.
```js
const loginSchema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'Dummy login schema',
    required: [
        'username',
        'password'
    ],
    type: 'object',
    additionalProperties: false,
    properties: {
        username: {
            description: 'Your username',
            type: 'string'
        },
        password: {
            description: 'Your password',
            type: 'string'
        },
    }
}
app.use(app.mw.ensureSchema(loginSchema));
```

<a name="komapi-middleware-requestlogger"></a>
###### app.mw.requestLogger([options])
Logs request data. This will always be mounted at the top of the middleware stack if mounted directly on the application using `app.use`
```js
app.use(app.mw.requestLogger());
```

### Authentication
Authentication is handled by [komapi-passport](https://github.com/komapijs/komapi-passport).

### ORM
Komapi provides built-in support for [Objection.js](https://github.com/Vincit/objection.js). The ORM related functionality is all available through `app.orm`.
Note that a [database driver](#database-access) is required.

Properties prefixed by `$` in `app.orm` are required default properties, while properties without `$` are the application [models](#models).
```js
{
    $Model // Objection base model
    $transaction // Objection transaction object
    $ValidationError // Objection validation error class
    $migrate // Knex migrate
}
```

This is an example of how to use the ORM in a route module
```js
// Export route
module.exports = (router, app) => {

    /**
     * GET /accounts
     * Responds with all accounts
     */
    router.get('/accounts', (ctx) => ctx.app.orm.Account.query().then(ctx.send));
    
    return router;
};
```

#### Objection.js
Objection is initialized using:
```js
const Knex = require('knex');
app.objection(Knex(opts));
```
where `Knex(opts)` is a valid [knex](http://knexjs.org/#Installation-client) instance.

##### Objection Plugins
Komapi provides a number of default plugins to Objection.

###### Soft Delete
Add `static get softDelete() { return true; }` to your models to enable soft delete. Note that this requires a `deleted_at` column in your schema. 

Usage when enabled
```js
model.delete(); // Model is soft-deleted
model.$query(); // Not found
model.$query().withArchived(); // Found again
model.$query().withArchived().restore(); // Undeleted
model.$query(); // Found
model.delete({force:true}); // Model is hard-deleted
model.$query().withArchived(); // Not found
```

###### Timestamps
Add `static get timestamps() { return true; }` to your models to enable timestamps. This will automatically set `created_at` and `updated_at`. Note that this requires `created_at` and `updated_at` columns in your schema. Currently not supported for N:M intersection tables (missing lifecycle hooks from Objection.js)

###### camelCase
Add `static get camelCase() { return true; }` to your models to enable camelCase for system columns like `deleted_at`, `created_at` and `updated_at`.

#### Models
Models are modules exporting an [Objection](https://github.com/Vincit/objection.js) model. The ORM and app objects are injected into the module and provides access to the Objection classes necessary to create the Objection model. 

Models can automatically be loaded by adding the following line to your application `index.js` file, where `path` is the path to your model directory.
```js
app.models(path);
```
This loads every model into `app.orm[Modelname]`, which is accessible throughout your application. Note that it is the name of the model class exported from the module that will be used to access the model

##### Example Model
```js
// Export model
module.exports = (orm) => {
    return class Account extends orm.$Model {
            static get tableName() { return 'Account'; }
        };
};
```

### Tips
1. For better performance, add the following line before any import statements in your main application file `global.Promise = require('babel-runtime/core-js/promise').default = require('bluebird');`. This enables usage of Bluebird promises by default and significantly improves performance.

### License

  [MIT](LICENSE.md)
