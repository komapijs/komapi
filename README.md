# KomAPI

Komapi is an opinionated Node.js framework built on top of Koa 2.0. Note that there might be occasional breaking changes during the pre-v1.0.0 cycles.

[![npm](https://img.shields.io/npm/v/komapi.svg)](https://npmjs.org/package/komapi)
[![Travis](https://img.shields.io/travis/komapijs/komapi/master.svg)](https://travis-ci.org/komapijs/komapi)
[![Codecov branch](https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg)](https://codecov.io/gh/komapijs/komapi)
[![npm](https://img.shields.io/npm/l/komapi.svg)](https://github.com/komapijs/komapi/blob/master/LICENSE.md)

Komapi is essentially Koa with some added sugar, which means that you can use any Koa compatible middleware and use the Koa documentation as reference. Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to override these with your own where necessary.

## Usage
- [Installation](#installation)
- [Hello World](#hello-world)
- [Example Project Structure](#example-project-structure)
- [Routing](#routing)
  - [Route Modules](#route-modules)
    - [Example Route Modules](#example-route-module)
  - [Loading Route Modules](#loading-route-modules)
- [Middleware](#middleware)
  - [Mounting Middleware](#mounting-middleware)
  - [Included Middleware](#included-middleware)
    - [Komapi Native Middleware](#komapi-native-middleware)
      - [app.mw.authenticate(strategies, [options], [callback])](#komapi-middleware-authenticate)
      - [app.mw.ensureAuthenticated()](#komapi-middleware-ensureauthenticated)
      - [app.mw.ensureSchema(schema, [key])](#komapi-middleware-ensureschema)
      - [app.mw.requestLogger([options])](#komapi-middleware-requestlogger)
- [Authentication](#authentication)     
- [ORM](#orm)
  - [Objection.js](#objectionjs)
    - [Objection Plugins](#objection-plugins)
      - [Soft Delete](#soft-delete)
      - [Timestamps](#timestamps)
      - [Restify (oData for Objection)](#restify-odata-for-objection)
      - [camelCase](#camelcase)
  - [Models](#models)
    - [Example Model](#example-model)
- [Optional Dependencies](#optional-dependencies)
  - [Database](#database)
  - [Templates](#templates)
- [License](#license)
  
### Installation
Install through npm and require it in your `index.js` file.
```bash
$ npm install --save komapi
```

### Hello World
```js
'use strict';

// Dependencies
const Komapi = require('komapi');

// Init
const app = new Komapi({
    env: 'development'
});

// Setup
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
'use strict';

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
app.use(app.mw.bodyParser());
```

#### Included Middleware
Komapi provides built-in middlewares for most use cases. Some of these are just wrappers around existing Koa middleware, but provided for convenience and possible extensions/defaulting later on.

| Middleware | Description | Reference |
| --- | --- | --- |
| `app.mw.authenticate(strategies, [options], [callback])` | Authenticate requets | [authenticate](komapi-middleware-authenticate), [Passport](http://passportjs.org/) |
| `app.mw.bodyParser([options])` | Parse request body | [koa-bodyparser](https://github.com/koajs/bodyparser) |
| `app.mw.compress([options])` | Compresses responses | [koa-compress](https://github.com/koajs/compress) |
| `app.mw.cors([options])` | Set CORS headers | [kcors](https://github.com/koajs/cors) |
| `app.mw.etag([options])` | Generates ETags | [koa-etag](https://github.com/koajs/etag), [koa-conditional-get](https://github.com/koajs/conditional-get) |
| `app.mw.ensureAuthenticated()` | Require authentication | [ensureAuthenticated](#komapi-middleware-ensureauthenticated) |
| `app.mw.ensureSchema(schema, [key])` | Validate requests | [ensureSchema](#komapi-middleware-ensureschema) |
| `app.mw.requestLogger([options])` | Log requests | [requestLogger](#komapi-middleware-requestlogger) |
| `app.mw.route([middlewares ...], path)` | Load route | [Loading Route Modules](#loading-route-modules) |
| `app.mw.headers([options])` | Set response headers | [helmet](https://github.com/helmetjs/helmet) |
| `app.mw.static(root, [options])` | Serve static files | [koa-static](https://github.com/koajs/static) |
| `app.mw.views(root, [options])` | Use templates | [Template Rendering](#template-rendering), [koa-views](https://github.com/queckezz/koa-views) |

##### Komapi Native Middleware
<a name="komapi-middleware-authenticate"></a>
###### app.mw.authenticate(strategies, [options], [callback])
Authenticates requests. Based on [Passport](http://passportjs.org/) and requires initialization of authentication strategies through `app.authInit()`
```js
app.use(app.mw.authenticate('local'));
```

For more information, see [authentication](#authentication) and [Passport](http://passportjs.org/).

<a name="komapi-middleware-ensureauthenticated"></a>
###### app.mw.ensureAuthenticated()
Ensures requests are authenticated. If requests are not authenticated, this will throw a 401 response.
```js
app.use(app.mw.ensureAuthenticated());
```

<a name="komapi-middleware-ensureschema"></a>
###### app.mw.ensureSchema(schema, [key])
Ensures request body (`ctx.request.body`) conforms to the provided JSON Schema. Note that `app.mw.bodyParser()` must be enabled before this to function. Can optionally validate a different key on the `ctx.request` object (body, params or query). See [JSON Schema](http://json-schema.org/) for more information on how to create a schema.
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
Authentication is handled by [Passport](http://passportjs.org/) through Komapi provided middlewares. The following middlewares are used for authentication purposes:

| Middleware | Description |
| --- | --- |
| `app.mw.authInit(strategies...)` | Initialize and enable authentication strategies. Functions similarly to `passport.use`, with the exception that all strategies must be provided at once. |
| `app.mw.authenticate(strategies, [options], [callback])` | Only used to authenticate requests (e.g. logging in users). This is usually only used on endpoints where a user is expected to be unauthenticated and requesting authentication. For session based authentication schemes it is only used on the endpoint used to generate the session. For non-session based schemes, it is often used with different strategies on different endpoints. A `/login` endpoint (using `app.mw.authenticate('basic')` may be provided for logging in using username and password to get a JWT for use on all the other endpoints (using `app.mw.authenticate('jwt')`). |
| `app.mw.ensureAuthenticated()` | This is used to restrict access to endpoints for only authenticated requests. See the example below where authentication is preferred, but not required in the entire application, except for a single endpoint that requires an authenticated request. |

Example:
```js
'use strict';

// Dependencies
const Komapi = require('komapi');
const BasicStrategy = require('passport-http').BasicStrategy;
const AnonymousStrategy = require('passport-anonymous').Strategy;

// Init
const app = new Komapi({
    env: 'development'
});

// Initialize authentication and the strategies
app.authInit(new BasicStrategy(function (userid, password, done) {
    if (userid === 'test' && password === 'testpw') return done(null, {
        id: 1
    });
    done(null, false);
}), new AnonymousStrategy());

// Authenticate the request using either BasicStrategy or AnonymousStrategy
app.use(app.mw.authenticate(['basic', 'anonymous'], {session: false}));

// Requesting /secured will result in a 401, unless you authenticated with BasicStrategy
app.use('/secured', app.mw.ensureAuthenticated(), (ctx) => {
    ctx.body = 'Protected resource!';
});
// This will always work
app.use((ctx) => {
    ctx.body = 'Hello World!';
});

// Listen
app.listen(process.env.PORT || 3000);
```

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
'use strict';

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
app.objection(options);
```
where `options` is a valid [knex](http://knexjs.org/#Installation-client) config object.

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

###### Restify (oData for Objection)
Use `model.oDataFilter(ctx.request.query)` for your queries and it will automatically parse the oData query and return the result. It is also possible to return `model.oDataFilter(ctx.request.query).metaThen()` to include metadata like pagination and resultsizes, but this API is not stable and will change!

Note that this module is under active development.

###### camelCase
Add `static get camelCase() { return true; }` to your models to enable camelCase for system columns like `deleted_at`, `created_at` and `updated_at`.

#### Models
Models are modules exporting an [Objection](https://github.com/Vincit/objection.js) model. The ORM and app objects are injected into the module and provides access to the Objection classes necessary to create the Objection model. 

Models can automatically be loaded by adding the following line to your application `index.js` file, where `path` is the path to your model directory.
```js
app.models(path);
```
This loads every model into `app.orm[Modelname]`, which is accessible throughout your application. Note that it is the filename of the model module with a capitalized first letter that will be used to access the model

##### Example Model
```js
'use strict';

// Export model
module.exports = (orm) => {
    return class Account extends orm.$Model {
            static get tableName() { return 'Account'; }
        };
};
```

### Optional Dependencies
##### Database
Database access requires a database driver supported by `knex`. See [knex documentation](http://knexjs.org/#Installation)
for more information. This is a short list of supported drivers and how to install them:
```bash
$ npm install pg --save
$ npm install sqlite3 --save
$ npm install mysql --save
$ npm install mysql2 --save
$ npm install mssql --save
$ npm install mariasql --save
$ npm install strong-oracle --save
$ npm install oracle --save
```
##### Templates
Template rendering through `app.mw.views()` requires a template engine supported by `consolidate`. See [consolidate.js documentation](https://github.com/tj/consolidate.js#supported-template-engines)
for more information. Some common template engines are listed below for convenience:
```bash
$ npm install handlebars --save
$ npm install ejs --save
$ npm install jade --save
$ npm install nunjucks --save
$ npm install twig --save
```

### License

  [MIT](LICENSE.md)
