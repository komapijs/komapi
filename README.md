# KomAPI

Komapi is an opinionated Node.js framework built on top of Koa v2.2 and requires Node.js v7.8.0 or higher.
 
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
  - [Example Route Module (routes.js)](#example-route-module)
- [Logging](#logging)
- [Middleware](#middleware)
  - [Mounting Middleware](#mounting-middleware)
  - [Recommended Middleware](#recommended-middleware)
    - [Komapi Native Middleware](#komapi-native-middleware)
      - [app.mw.ensureSchema(schema, [key])](#komapi-middleware-ensureschema)
      - [app.mw.requestLogger([options])](#komapi-middleware-requestlogger)
      - [app.mw.notFound()](#komapi-middleware-notfound)
- [Authentication](#authentication)     
- [ORM](#orm)
  - [Objection.js](#objectionjs)
  - [Models](#models)
    - [Example Model](#example-model)
- [Services](#services)
- [Tips](#tips)
- [License](#license)
  
### Installation
Install through npm and require it in your `index.js` file.
```bash
$ npm install --save komapi
```

### Configuration
Komapi accepts a configuration object during instantiation.
Note that like most frameworks and libraries, Komapi sets `NODE_ENV=development` unless `NODE_ENV=production` or Komapi is instantiated with `new Komapi({ env: 'production' })`. It is very important to do either for production applications. Failure to do so will result in leaking stacktraces and reduced performance.

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
Komapi supports all routers compatible with Koa and allows the developer to make their own choice in how to implement routing.

It is often advisable to separate routes in modules and exporting a router for related routes. This can be easily be done using [koa-router](https://github.com/alexmingoia/koa-router/tree/master/).
Komapi has a helper method for registering routes which ensures proper handling of unknown methods when using [koa-router](https://github.com/alexmingoia/koa-router/tree/master/).

Komapi provides four helpful functions when creating routes, namely `ctx.send`, `ctx.sendIf`, `ctx.apiResponse` and `ctx.apiResponseIf`. The difference between these is that `ctx.send` and `ctx.sendIf` sends the first parameter as the response body, while `ctx.apiResponse` and `ctx.apiResponseIf` encapsulates the response in `{ metadata: additionalData, data: body }`, where `body` is the first parameter and `additionalData` is the second (optional) parameter.
The `ctx.apiResponse` and `ctx.apiResponseIf` helpers are especially useful when creating APIs as you can easily add metadata (e.g. pagination) to your responses and enforce a standard response format. It is possible to override these functions with your own implementation if you require a different response structure.
All of these helpers are bound to `ctx` which means that you can add `.then(ctx.send)` or `.then(ctx.apiResponse)` to your promise chain to send the result. `ctx.sendIf` and `ctx.apiResponseIf` sends a 404 if your result is not truthy. This is particularly useful when requesting single resources in a REST API. 

#### Example Route Module
`routes.js`
```js
// Dependencies
import Router from 'koa-router';

// Init
const router = new Router();
router.get('/', ctx => ctx.send({ status: 'ok' }));

// Exports
export default router.routes();
```
This can then be used in your `index.js` application file
```js
// Dependencies
import Komapi from 'komapi';
import routes from './routes';

// Init
const app = new Komapi();

// Add routes
app.route(routes);

// Listen
app.listen(process.env.PORT || 3000);
```

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
| [app.mw.notFound](#komapi-middleware-notfound) | Handle 404 not found |
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

<a name="komapi-middleware-notfound"></a>
###### app.mw.notFound()
A simple middleware for handling Not Found errors. This should be added as the first middleware.
```js
app.use(app.mw.notFound());
```

### Authentication
Authentication is handled by [komapi-passport](https://github.com/komapijs/komapi-passport).

### ORM
Komapi recommends using [Objection.js](https://github.com/Vincit/objection.js). The ORM related functionality should be used through `app.orm`.

#### Objection.js
Objection.js is an optional peer dependency of Komapi and must be installed separately.

```js
// Dependencies
import Komapi from 'komapi';
import Knex from 'knex';
import { Model } from 'objection';

// Init
const app = new Komapi();
Model.knex(Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: 'example.db'
  }
}));
class User extends Model {
  static get tableName() { return 'users'; }
}
app.models({ User });

// The User model is now available through app.orm.User and query-errors are automatically logged
app.orm.User.query().findById(1).then(user => console.log(user));
```

#### Models
Models are objection models. See [Objection.js](https://github.com/Vincit/objection.js) [model documentation](http://vincit.github.io/objection.js/#models) for more information. 
It is recommended to create your own base model and inherit from that instead of inheriting directly from the Objection model in case you need to add plugins or adjust model behaviour later.

Models are assign to `app.orm` by providing an object of your models to `app.models()`:
```js
import User from './models/User';
import Post from './models/Post';
import Comment from './models/Comment';

app.models({ User, Post, Comment });
console.log(app.service);
```
This loads every model into `app.orm[Modelname]`, which is accessible throughout your application.

##### Example Model
```js
// Export model
import { Model } from 'objection';

export default class User extends Model {
  static tableName = 'users';
}
```

This is an example of how to use the models in a route module
```js
// Dependencies
import Router from 'koa-router';

// Init
const router = new Router();
router.get('/', ctx => ctx.app.orm.User.query().then(ctx.apiResponse));
router.get('/:id', ctx => ctx.app.orm.User.query().findById(ctx.params.id).then(ctx.apiResponseIf));

// Exports
export default router.routes();
```

### Services
Komapi provides a simple method of loading reusable services that depends on the application context. Services are simple classes or functions that needs to be instantiated with the application as a parameter.

```js
import User from './services/User';
import Post from './services/Post';
import Comment from './services/Comment';

app.services({ User, Post, Comment });
console.log(app.service);
```
This loads every service into `app.service[Servicename]`, which is accessible throughout your application.

This is an example of a service in Komapi
```js
export default class UserService {
  constructor(app) {
    this.app = app;
  }
  fetchActiveUsers(offset = 0, limit = 10) {
    return this.app.orm.User.query().where('is_active', true).offset(offset).limit(limit);
  }
};
```

### Tips
1. For better performance, add the following line before any import statements in your main application file `global.Promise = require('babel-runtime/core-js/promise').default = require('bluebird');`. This enables usage of Bluebird promises by default and significantly improves performance.

### License

  [MIT](LICENSE.md)
