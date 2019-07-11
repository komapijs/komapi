# Komapi

Komapi is an opinionated Node.js framework with official typescript support built on top of [Koa][koa-url].

_Disclaimer: There will be breaking changes and outdated documentation during the pre-v1.0.0 cycles._

[![npm][npm-image]][npm-url]
[![CircleCI][circleci-image]][circleci-url]
[![Codecov branch][codecov-image]][codecov-url]
[![David][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![renovate-app badge][renovate-image]][renovate-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![license][license-image]][license-url]

Komapi is essentially [Koa][koa-url]+[typescript][typescript-url] with some added sugar, which means that you can use any [Koa][koa-url] compatible middleware and use the [Koa][koa-url] documentation as reference.
Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to use Komapi exactly as you would use [Koa][koa-url] and still enjoy many of the built-in features.

**Note:** This documentation only contains Komapi specific functionality on top of [Koa][koa-url].
For documentation on topics not covered here, please consult the official [Koa][koa-url] documentation.

## Documentation

- [Installation](#installation)
- [Usage](#usage)
  - [Hello World](#usage-hello-world)
  - [Configuration](#usage-configuration)
  - [Context](#usage-context)
  - [Lifecycle](#usage-lifecycle)
  - [Error Handling](#usage-error-handling)
  - [Services](#usage-services)
  - [Typescript](#usage-typescript)
- [API](#api)
  - [new Komapi([options])](#api-komapi)
  - [ensureSchema(jsonSchema, data)](#api-utilities-ensureSchema)
  - [createEnsureSchema(jsonSchema)](#api-utilities-createensureSchema)
  - [errorHandler([options])](#api-middlewares-errorhandler)
  - [requestLogger([options])](#api-middlewares-requestlogger)
  - [healthReporter([options])](#api-middlewares-healthreporter)
- [License](#license)

<a id="installation"></a>

### Installation

Install through npm and make it a production dependency in your application.

```bash
$ npm install --save komapi
```

<a id="usage"></a>

### Usage

<a id="usage-hello-world"></a>

#### Hello World!

This will create a server listening on port 3000 and always respond with "Hello World!".
Create a file `index.js` and add the following code.

```js
import Komapi from 'komapi';

// Create app
const app = new Komapi();

// Add middleware that always respond 'Hello World!' - using the built in `ctx.send()` helper
app.use(ctx => ctx.send('Hello World!'));

// Start listening
app.listen(3000);
```

<a id="usage-configuration"></a>

#### Configuration

Komapi comes with sensible defaults, but allows for customizations for a wide variety of use cases.

```js
import CustomWriteableLogStream from './lib/MyLogStream';
import AccountService from './services/Account';
import ChatService from './services/Chat';

const app = new Komapi({
  config: {
    env: 'production', // This is super important to set to production when deployed
    proxy: true,
    subdomainOffset: 3,
    silent: true,
    keys: ['my-super-secret-key'],
    instanceId: 'my-custom-instance-id',
  },
  services: {
    Account: AccountService,
    Chat: ChatService,
  },
  logOptions: {
    // This is passed throug directly to Pino. See Pino documentation for more information
    level: 'trace',
    redact: {
      paths: ['request.header.authorization', 'request.header.cookie'],
      censor: '[REDACTED]',
    },
  },
  logStream: new CustomWriteableLogStream(), // The writeable stream to output logs to
});

// Access current config through app.config
console.log(`Current instance id: ${app.config.instanceId}`);
```

<a id="usage-context"></a>

#### Context

Komapi creates a transaction context upon instantiation that is very useful for tracking context throughout the application.
This context is most often used in the request-response cycle for keeping track of authentication, transaction-type and request-id in logs or even in code to make it context aware, without having to pass around a context object.

By default, Komapi creates a separate context for each request-response cycle through a custom middleware.
The context namesspace is available on the `app.transactionContext` property.

Example middleware on how to access transaction context

```js
export default function logTransactionContextMiddleware(ctx, next) {
  // You use transactionContext.set('myVar', 'myValue') to set transaction values that should be available in other parts of your application
  console.log(`Current requestId from transactionContext: ${ctx.app.transactionContext.get('requestId')}`);

  // The request id is also available from the middleware request object
  console.log(`Current requestId from ctx.request.requestId: ${ctx.request.requestId}`);

  // Continue
  return next();
}
```

If you need to use transaction context outside of a request-response cycle (e.g. in a script), then you can run your code in `app.run(() => myFunction())`.
Alternatively you can create the transaction context yourself and handle it manually. See [cls-hooked][cls-hooked-url] for more information. The existing namespace is available in `app.transactionContext`.

Example on how to utilize the transaction context outside of the request-response cycle

```js
import Komapi from 'komapi';
import { getNamespace } from 'cls-hooked';

// Create app instance
const app = new Komapi({
  config: {
    instanceId: 'komapi-instanceid',
  },
});

// Function for logging transaction context.
async function logTransactionContext() {
  // Log transaction context with app available
  console.log(`Transaction context variable Foo: ${app.transactionContext.get('Foo')}`);

  // You can also log transaction context without app available - must know the instance id in advance.
  const transactionContext = getNamespace('komapi-instanceid');
  console.log(`Transaction context variable Foo: ${transactionContext.get('Foo')}`);
}

// Run async code with transaction context
app.run(async () => {
  // Set transaction context
  app.transactionContext.set('Foo', 'My Value');

  // Run my function
  await logTransactionContext();

  console.log('Done');
});
```

<a id="usage-lifecycle"></a>

#### Lifecycle

All applications have some life cycle events and it is important to be aware of what these means for your application.
Most applications do some initialization before actually doing the work (e.g. serving http requests) followed by some clean up before shutting down.
A typical web application do some initialization, such as establishing a database connection before accepting work (e.g. handling http requests), followed by a period of time in a running state while accepting work then stops accepting work before the connection is closed (to prevent connection leaks) and finally stop executing.

The current state is available in `app.state`, and may be one of 4 different states

| State      | Description                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `STARTING` | Application is transitioning to `STARTED` state - triggered from `app.start()` |
| `STARTED`  | Application is fully initialized and accepting work                            |
| `STOPPING` | Application is transitioning to `STOPPED` state - triggered from `app.stop()`  |
| `STOPPED`  | Application is in stopped state (or not started yet)                           |

There are 2 lifecycle handlers in Komapi - `app.start()` and `app.stop()` that must be called before accepting work and before termination of the application.
Komapi automatically registers the `app.close()` handler on application termination events so you should normally not need to call it manually.

Even though you do not need to call the `app.start()` handler manually if you only run code in `app.run()` or through `app.listen()`, it is highly recommended to be explicit and call it manually.
This ensures that any initialization is performed _before_ accepting work and not as part of accepting the first unit of work.
If you do not call it manually and start your web application with `app.listen()`, then `app.start()` will be triggered automatically and the first request will wait for it to finish before handling the request.
This may result in very high latency on the first few requests.

Best practice examples on using lifecycle in Komapi

```js
import Komapi from 'komapi';

// Create app instance
const app = new Komapi();

/**
 * Alternative 1: Web application
 */
app.start().then(() => app.listen(3000));

/**
 * Alternative 2: Run arbitrary code
 */
app.start().then(() =>
  app.run(async () => {
    console.log('Running custom code');
  }),
);
```

<a id="usage-error-handling"></a>

#### Error Handling

Error handling is important, but it is difficult to get it right and is often neglected.
Komapi attempts to make error handling as flexible and simple as possible, but it is no magic bullet and it requires some effort from you, the developer.
The main goals with the error handling functionality in Komapi is to:

1. ensure application stability
2. provide useful and consistent API responses - without leaking sensitive details - in case something went wrong
3. simplify reporting and debugging in production through detailed error logging
4. make it simple to do error handling right for the developer

Komapi uses [botched][botched-url] under the hood.
If a non-[botched][botched-url] error is discovered, it will be wrapped in a [botched][botched-url] error before logging or before being sent to the client.
This ensures a consistent and secure interface that automatically conforms to the [JSON:API][jsonapi-url] spec using the built in [errorHandler](#api-middleware-errorhandler) middleware.

If you want to provide context to error responses, e.g. set the status code, headers or set a human friendly error message, you must manually throw a [botched][botched-url] error including this data.
This might feel cumbersome at first, but this is done to prevent any leak of sensitive information and ensure consistency.

It is highly recommended to use [botched][botched-url] for error handling in your code as well as encapsulating external errors in libraries.
For more information on how to take advantage of [botched][botched-url] errors, see [botched][botched-url] documentation for more information.

Here is an example of how to use the error handling in a middleware:

```js
import { BadRequest } from 'botched';

// Using Error objects
app.use(ctx => {
  throw new BadRequest(
    {
      code: 'MY_ERR_CODE_1',
      meta: {
        isAuthenticated: true,
      },
      secrets: {
        APIKeyId: 'A2D6F',
      },
    },
    'Invalid request body',
  );
});
```

This will result in the following response (note that only `code` and `meta` properties are included in the response, while all properties are included in logs):

```json
{
  "errors": [
    {
      "id": "df8820bb-ccb8-478a-8a84-f4b33426b097",
      "code": "MY_ERR_CODE_1",
      "status": "400",
      "title": "Bad Request",
      "detail": "Invalid request body",
      "meta": {
        "isAuthenticated": true
      }
    }
  ]
}
```

<a id="usage-services"></a>

#### Services

Komapi has a concept of `services` which encapsulates re-usable stateful functionality and makes it available throughout the application.
Services can be as simple or as complex as needed for the application, and can be inter-connected and context dependent.
Typically services should encapsulate models, complex logic (e.g. events, authorization and data visibility) and usage of other services so that your routes and controllers can be decoupled and as small as possible.

Common examples of services:

- `AccountService`: provides a simple interface for `create`, `update`, `disable`, `delete`, `notify`, `getActiveAccount`, `getAccountsWithOutstandingInvoices` etc.
  Most of these methods involve complex logic such as sending out events to an eventbus, querying multiple services, ensure that data visibility is restricted based on the current authenticated context
- `ChatService`: provides a simple interface for `sendMessage` and `createGroup` etc.
  The complexity of authorization, event handling and connecting to the data store is hidden from the consumer of the service
- `EventService`: Enables other services to public (and subscribe to) events in a message bus, websockets, push notifications, redis cache or just locally in the application depending on needs.
- `WebSocketService`: Manage websocket connections so that a single websocket connection can handle many different channels and events.
- `DatabaseService`: Handle migrations, database connections and clean up when application shuts down.

All services must inherit from the base Komapi service (named export `Service`), either directly or indirectly.
The services must also implement the `service.start()` and `service.stop()` methods if initialization or resource cleanup must be done on application `app.start()` and `app.stop()` respectively.
This is especially important for services that create connections or handle state - e.g. managing connections to databases, websockets, message queues and repopulating caches etc.
Typical use case for these handlers include setting up connections, and closing connections when application shuts down.
You can even publish events to let clients know that your application is shutting down and that they should reconnect to a different endpoint.

Services are initiated with Komapi in the `options` object under `options.services`

```js
import Komapi from 'komapi';
import AccountService from './services/Account';
import ImageService from './services/Image';

// Create app
const app = new Komapi({
  services: {
    Account: AccountService,
    Image: ImageService,
  },
});

/**
 * Note that we wrap the code in `app.run()` to ensure that the context is preserved and lifecycle handlers are called correctly
 *
 * This is the only supported way of running arbitrary code outside of `app.listen()` scenarios
 */
app.run(async () => {
  // Service instances are available under app.services
  const newAccount = await app.services.Account.create({ firstName: 'Joe', lastName: 'Smith' });
});
```

Example service `AccountService`

```js
import { Service } from 'komapi';
import { BadRequest, Unauthorized } from 'botched';
import AccountModel from '../models/Account';

export default class AccountService extends Service {
  create(account) {
    // Get current authentication context - See documentation on Transaction Context for more information
    const auth = this.app.transactionContext.get('auth');

    // Check transaction context whether we are allowed to create users
    if (!auth || !auth.scope.includes('create_user'))
      throw new Unauthorized(
        { meta: { scope: 'create_user' } },
        'Valid authentication with scope "create_user" required to create new accounts!',
      );

    // Check if first and last name is set - normally you would use schema validation to ensure these are set
    if (!account.firstName || !account.lastName) throw new BadRequest('Both firstName and lastName is required!');

    return AccountModel.query().insert({
      firstName: account.firstName,
      lastName: account.lastName,
      createdBy: auth.id,
    });
  }
}
```

<a id="typescript"></a>

### Typescript

Komapi is built with typescript and provides full support for types out of the box.
There are several options for augmenting Komapi with your own types depending on your use case.

<a id="typescript-augmentation"></a>

##### Option 1: Augmenting Komapi with your own types

This is the recommended approach, but requires that you only use a single Komapi configuration in your application.
The benefits here outweighs the drawbacks for the vast majority of use cases, and enables [Koa][koa-url] native libraries to function with Komapi without any bridging necessary.
The obvious drawback here is that the typings will be globals so you cannot have different configurations of Komapi active at the same time.
E.g. If you want to have different state, context or services, between different instances of Komapi, then this is not the option for you.

```typescript
import Komapi from 'komapi';
import services from '../services';

// Custom Types
interface MyCustomState {
  isAdmin: boolean;
}
interface MyCustomContext {
  getCurrentUser: () => User | null;
}
type MyServices = typeof services;

/**
 * Globally augment Komapi with custom types according to your application
 */
declare module 'komapi' {
  interface Services extends MyServices {}
}

// Create app
const appWithCustomContext = new Komapi<MyCustomState, MyCustomContext>({ services });

// Utilize custom context in your middlewares
appWithCustomContext.use(async (ctx, next) => {
  // Is this user an admin?
  if (ctx.state.isAdmin) console.log('Current user is an admin');
  else console.log('Current user is NOT an admin');

  // Get current user
  const user = await ctx.getCurrentUser();
  console.log('Current user:', user);

  // Use the account service to notify the user about something
  await ctx.app.services.Account.notify(user);

  return next();
});
```

<a id="typescript-generics"></a>

##### Option 2: Using Koa generics

Another option is to utilize the generics option in [Koa][koa-url] to add state and augment the context.
For convenience, we have added a third generic that you can use to add strong typing for your services.

The benefit of this option is that it keeps the scope of your types limited to only the specific instance of you application.
The drawback is that you need to specify types when using other external libraries - and they must support generic types - as they only assume default [Koa][koa-url] types.
Most libraries are only made for use within [Koa][koa-url] and you will therefore lose your instance specific typing - e.g. `app.services` and `app.log`.

```typescript
import Komapi from 'komapi';
import services from '../services';

// Custom Types
interface MyCustomState {
  isAdmin: boolean;
}
interface MyCustomContext {
  getCurrentUser: () => User | null;
}
interface MyCustomOptions {
  services: {
    Account: AccountService;
  };
}

// Create app
const appWithCustomContext = new Komapi<MyCustomState, MyCustomContext, MyCustomOptions>({ services });

// Utilize custom context in your middlewares
appWithCustomContext.use(async (ctx, next) => {
  // Is this user an admin?
  if (ctx.state.isAdmin) console.log('Current user is an admin');
  else console.log('Current user is NOT an admin');

  // Get current user
  const user = await ctx.getCurrentUser();
  console.log('Current user:', user);

  // Create user
  await ctx.app.services.Account.create(user);

  return next();
});
```

To help with using libraries initially intended for [Koa][koa-url], we provide a generic type `ContextBridge` that makes it a bit easier to handle typings using this approach.

```typescript
import Router from 'koa-router';
import { ContextBridge } from 'komapi';
import services from '../services';

// Types
interface MyCustomState {
  isAdmin: boolean;
}
interface MyCustomContext {
  getCurrentUser: () => User | null;
}
interface MyCustomOptions {
  services: typeof services;
}

// Init
const router = new Router<MyCustomState, ContextBridge<MyCustomContext, MyCustomOptions>>({ services });

// Routes
router.get('/test', async (ctx, next) => {
  // Is this user an admin?
  if (ctx.state.isAdmin) console.log('Current user is an admin');
  else console.log('Current user is NOT an admin');

  // Get current user
  const user = await ctx.getCurrentUsers();
  console.log('Current user:', user);

  // Create user
  await ctx.app.services.Account.create(user);

  return next();
});

// Exports
export default router;
```

<a id="api"></a>

### API

<a id="api-komapi"></a>

#### new Komapi([options])

```js
import Komapi from 'komapi';

const app = new Komapi();
```

##### Parameters:

- `options` (object): Object with options

  - `config` (object): Core configuration
    - `env` (string): Environment setting - it is **highly** recommended to set this to `NODE_ENV`. Default: `development`
    - `name` (string): The name of the application. Default: `Komapi application`
    - `instanceId` (string): The unique identifier of this instance - useful to identify the application/service instance in heavily distributed systems. Default: `process.env.HEROKU_DYNO_ID || *auto generated uuid*`
    - `serviceId` (string): The unique identifier of this instance - useful to identify the application/service type in heavily distributed systems. Default: `process.env.HEROKU_APP_ID || 'komapi'`
    - `subdomainOffset` (number): Offset of .subdomains to ignore. See [Koa documentation][koa-documentation-url] for more information. Default: `2`
    - `proxy` (boolean): Trust proxy headers (includes `x-request-id` and `x-forwarded-for`). See [Koa documentation][koa-documentation-url] for more information. Default: `false`
  - `logOptions` (object): Options to pass down to the [Pino][pino-url] logger instance. See [Pino documentation][pino-url] for more information
    - `level` (`fatal` | `error` | `warn` | `info` | `debug` | `trace` | `silent`): Log level verbosity Default: process.env.LOG_LEVEL || 'info'
    - (...) - See [Pino options][pino-documentation-options-url] for more information
  - `logStream` (Writable): A writable stream to receive logs. Default: [Pino.destination()][pino-documentation-destination-url]
  - `services` (object): Object with map of string to classes that extend the `Service` class

<a id="api-utilities"></a>

#### Utility functions

<a id="api-utilities-ensureschema"></a>

##### ensureSchema(jsonSchema, data)

A json schema validator that provides detailed errors for native use in Komapi.

```js
import { ensureSchema } from 'komapi';

const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  required: ['firstName', 'lastName'],
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
  },
};
const data = {
  firstName: 'John',
  lastName: 'Smith',
};

app.use(ctx => {
  const body = ctx.request.body;
  const validData = ensureSchema(jsonSchema, body);

  // Use the validated data somewhere
});
```

###### Parameters:

- `jsonSchema` (object): The json schema to validate against
- `data` (object): The data to validate

<a id="api-utilities-createensureschema"></a>

##### createEnsureSchema(jsonSchema)

Create a precompiled schema validator function.
This is a faster alternative to using the inline `ensureSchema` function if you can compile the schema in advance.

```js
import { createEnsureSchema } from 'komapi';

const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  required: ['firstName', 'lastName'],
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
  },
};
const data = {
  firstName: 'John',
  lastName: 'Smith',
};

// Create a validator function
const validateData = createEnsureSchema(jsonSchema);

app.use(ctx => {
  const body = ctx.request.body;
  const validData = validateData(body);

  // Use the validated data somewhere
});
```

###### Parameters:

- `jsonSchema` (object): The json schema to validate against

<a id="api-middlewares"></a>

#### Middlewares

<a id="api-middlewares-errorhandler"></a>

##### errorHandler([options])

A simple, yet powerful error handling middleware.
This takes care to serialize error responses automatically while keeping sensitive information hidden.
Natively supports [botched][botched-url] errors.
This middleware is added automatically by Komapi.

**Note:** This middleware should be added after the [requestLogger](#api-middlewares-requestlogger) middleware, but before any other middleware.

```js
import { errorHandler } from 'komapi';

app.use(errorHandler({ showDetails: false }));
```

###### Parameters:

- `options` (object): Object with options
  - `showDetails` (boolean): Use the error `.toJSON()` method to generate responses instead of only responding with `{ id, code, status, title }` properties from the error? See [botched documentation][botched-url] for more information. Default: `true`

<a id="api-middlewares-requestlogger"></a>

##### requestLogger([options])

Log each request with details as they are processed.
This middleware is added automatically by Komapi.

**Note:** This middleware should be added before any other middleware to ensure that all requests are logged.

```js
import { requestLogger } from 'komapi';

app.use(requestLogger({ level: 'debug' }));
```

###### Parameters:

- `options` (object): Object with options
  - `level` (string): What log level to use for request logs? Choose between `fatal`, `error`, `warn`, `info`, `debug` and `trace`. Default: `info`

<a id="api-middlewares-healthreporter"></a>

##### healthReporter([options])

Komapi provides a useful health reporter middleware that conforms to the [Health Check Response Format for HTTP API spec](https://tools.ietf.org/html/draft-inadarei-api-health-check-03).
This can be used to easily add a useful and comprehensive health reporting endpoint.
By default it respects `app.state` when reporting health, but can be extended to also provide health reporting for downstream components and add more complex logic (e.g. is the database up? available capacity? system load?).
This middleware must be added manually and should be added to a specific path.
The recommended path is `/.well_known/_health` - but is application specific.

```js
import { healthReporter } from 'komapi';

router.get('/.well_known/_health', healthReporter());
```

###### Parameters:

- `options` (object): Object with options
  - `checks` (function): A function that receives the `ctx` parameter and should return an object, or a Promise that resolves to an object with a required `status` (valid values: `pass`, `fail` `warn`) property, optional `output` (string) property and optional `checks` (array) property with any valid property from the spec. See the link above.

<a id="roadmap"></a>

### Roadmap

1. Stable version

<a id="license"></a>

### License

[MIT](LICENSE.md)

[repo-url]: https://github.com/komapijs/komapi
[npm-url]: https://npmjs.org/package/komapi
[npm-image]: https://img.shields.io/npm/v/komapi.svg
[circleci-url]: https://circleci.com/gh/komapijs/komapi/tree/master
[circleci-image]: https://img.shields.io/circleci/project/github/komapijs/komapi/master.svg
[codecov-url]: https://codecov.io/gh/komapijs/komapi/tree/master
[codecov-image]: https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg
[david-url]: https://david-dm.org/komapijs/komapi/master
[david-image]: https://img.shields.io/david/komapijs/komapi.svg
[snyk-url]: https://snyk.io/test/github/komapijs/komapi/master
[snyk-image]: https://snyk.io/test/github/komapijs/komapi/master/badge.svg
[renovate-url]: https://renovateapp.com/
[renovate-image]: https://img.shields.io/badge/renovate-app-blue.svg
[conventional-commits-image]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg
[conventional-commits-url]: https://conventionalcommits.org/
[license-url]: https://github.com/komapijs/komapi/blob/master/LICENSE.md
[license-image]: https://img.shields.io/github/license/komapijs/komapi.svg
[koa-url]: https://github.com/koajs/koa
[koa-documentation-url]: https://koajs.com/#settings
[pino-url]: https://github.com/pinojs/pino
[pino-documentation-options-url]: https://github.com/pinojs/pino/blob/master/docs/api.md#options
[pino-documentation-destination-url]: https://github.com/pinojs/pino/blob/master/docs/api.md#pino-destination
[typescript-url]: https://github.com/microsoft/typescript
[cls-hooked-url]: https://github.com/jeff-lewis/cls-hooked
[botched-url]: https://github.com/ersims/botched
[jsonapi-url]: https://jsonapi.org/
