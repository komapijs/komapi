# KomAPI

Komapi is an opinionated Node.js framework with official typescript support built on top of [Koa][koa-url] and requires Node.js v8.11.1 or higher.
 
Disclaimer: There will be breaking changes and outdated documentation during the pre-v1.0.0 cycles.

[![npm][npm-image]][npm-url]
[![CircleCI][circleci-image]][circleci-url]
[![Codecov branch][codecov-image]][codecov-url]
[![David][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![renovate-app badge][renovate-image]][renovate-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![license][license-image]][license-url]

Komapi is essentially [Koa][koa-url]+[typescript][typescript-url] with some added sugar, which means that you can use any [Koa][koa-url] compatible middleware and use the [Koa][koa-url] documentation as reference.
Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to use Komapi exactly as you would use [Koa][koa-url] and still enjoy most of the built-in features.

## Usage
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [License](#license)
  
### Installation

Install through npm and make it a production dependency in your application.

```bash
$ npm install --save komapi
```

### Usage


**Note:** Komapi extends [Koa][koa-url] with common use cases and patterns for rapid development and best practices.
This documentation only serves as documentation for Komapi specific features and functionality on top of [Koa][koa-url].
For features or functionality not covered in this documentation, please consult the official [Koa][koa-url] documentation.


#### Hello World!

See [Komapi API](#api-komapi) for more information on configuration options.

```js
import Komapi from 'komapi';

// Create app
const app = new Komapi({
  config: {
    env: process.env.NODE_ENV, // Default: 'development'
  },
});

// Add middleware that always respond 'Hello World!' - using the built in `ctx.send()` helper
app.use(ctx => ctx.send('Hello World!'));

// Start listening
app.listen(process.env.PORT || 3000);
```


#### Configuration
 
Komapi comes with sensible defaults, but allows for customizations for a wide variety of use cases.

```js
const app = new Komapi({
  config: {
    env: 'production',
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
  logOptions: { // This is passed throug directly to Pino. See Pino documentation for more information
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


#### Services

Komapi has a concept of `services` which encapsulates re-usable stateful functionality and makes it available throughout the application.
Services can be as simple or as complex as needed for the application, and can be inter-connected and context dependent.
Typically services should encapsulate models, complex logic (e.g. events, authorization and data visibility) and usage of other services so that your routes and controllers can be decoupled and as small as possible.

Common examples of services:
  * `AccountService`: provides a simple interface for `create`, `update`, `disable`, `delete`, `notify`, `getActiveAccount`, `getAccountsWithOutstandingInvoices` etc.
    Most of these methods involve complex logic such as sending out events to an eventbus, querying multiple services, ensure that data visibility is restricted based on the current authenticated context 
  * `ChatService`: provides a simple interface for `sendMessage` and `createGroup` etc.
    The complexity of authorization, event handling and connecting to the data store is hidden from the consumer of the service
  * `EventService`: Enables other services to public (and subscribe to) events in a message bus, websockets, push notifications, redis cache or just locally in the application depending on needs.
  * `WebSocketService`: Manage websocket connections so that a single websocket connection can handle many different channels and events. 
  * `DatabaseService`: Handle migrations, database connections and clean up when application shuts down.

All services must inherit from the base Komapi service, either directly or indirectly.
The services must also implement the `service.init()` and `service.close()` methods if initialization or resource cleanup must be done on application start and shutdown respectively.
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

// Service instances are available under app.services
const newAccount = app.services.Account.create({ firstName: 'Joe', lastName: 'Smith' });
```
 
Example service `AccountService`

```js
import { Service } from 'komapi';
import { unauthorized } from 'boom';
import AccountModel from '../models/Account';

export default class AccountService extends Service {
  
  create(account) {
    // Get current authentication context - See documentation on Transaction Context for more information
    const auth = this.app.transactionContext.get('auth');
    
    // Check transaction context whether we are allowed to create users
    if (!auth || !auth.scope.includes('create_user')) throw unauthorized('Valid authentication with scope "create_user" required to create new accounts!');
    
    // Check if first and last name is set
    if (!account.firstName || !account.lastName) throw new Error('Both firstName and lastName is required!');
    
    return AccountModel.query().insert({ firstName: account.firstName, lastName: account.lastName, createdBy: auth.id });    
  }
}
``` 

#### Transaction Context

Komapi creates a transaction context upon instantiation that is very useful for tracking context throughout the application. 
This context is most often used in the request-response cycle for keeping track of authentication, transaction-type and request-id in logs or even in code to make it context aware, without having to pass around a context object.

By default, Komapi creates a separate context for each request-response cycle through a custom middleware that is available on the `app.transactionContext` property.

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
  
  console.log('Done')
});
```

#### Typescript

Komapi is built in typescript and provides full support for types out of the box.
There are several options for augmenting Komapi with your own types depending on your use case.

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
interface MyCustomServices {
  Account: AccountService;
}

// Create app
const appWithCustomContext = new Komapi<MyCustomState, MyCustomContext, MyCustomServices>({ services });

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

// Init
const router = new Router<MyCustomState, ContextBridge<MyCustomContext, typeof services>>({ services });

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
#### Komapi
`new Komapi([options])`

##### Parameters:
+ `options` (object): Object with options
  * `env` (string): Environment setting - it is **highly** recommended to set this to `NODE_ENV`. Default: `development`
  * `name` (string): The name of the application. Default: `Komapi application`
  * `subdomainOffset` (number): Offset of .subdomains to ignore. See [Koa documentation][koa-documentation-url] for more information. Default: `2`
  * `proxy` (boolean): Trust proxy headers (includes `x-request-id` and `x-forwarded-for`). See [Koa documentation][koa-documentation-url] for more information. Default: `false`
  + `logOptions` (object): Options to pass down to the [Pino][pino-url] logger instance. See [Pino documentation][pino-url] for more information
    * `level` (`fatal` | `error` | `warn` | `info` | `debug` | `trace` | `silent`): Log level verbosity Default: process.env.LOG_LEVEL || 'info'
    * (...) - See [Pino options][pino-documentation-options-url] for more information
  * `logStream` (Writable): A writable stream to receive logs. Default: [Pino.destination()][pino-documentation-destination-url]
+ `services` (object): Object with map of string to classes that extend the `Service` class


### License

  [MIT](LICENSE.md)


[npm-url]: https://npmjs.org/package/komapi
[npm-image]: https://img.shields.io/npm/v/komapi.svg
[circleci-url]: https://circleci.com/gh/komapijs/komapi/tree/master
[circleci-image]: https://img.shields.io/circleci/project/github/komapijs/komapi/master.svg
[codecov-url]: https://codecov.io/gh/komapijs/komapi/tree/master
[codecov-image]: https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg
[david-url]: https://david-dm.org/komapijs/komapi/master
[david-image]: https://img.shields.io/david/komapijs/komapi/master.svg
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
