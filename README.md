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

Komapi is essentially [Koa][koa-url]+[typescript][typescript-url] with some added sugar, which means that you can use any [Koa][koa-url] compatible middleware and use the [Koa][koa-url] documentation as reference. Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to use this exactly as you would use [Koa][koa-url].

## Usage
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [License](#license)
  
### Installation
Install through npm and require it in your `index.js` file.
```bash
$ npm install --save komapi
```

### Usage

**Note:** Komapi extends [Koa][koa-url] with common use cases and patterns for rapid development and best practices.
This documentation only serves as documentation for Komapi specific features and functionality on top of [Koa][koa-url].
For features or functionality not covered in this documentation, consult the official [Koa][koa-url] documentation.

#### Getting started - Hello world

See [Komapi API](#api-komapi) for more information on configuration options.

```typescript
import Komapi from 'komapi';

// Create app
const app = new Komapi({
  config: {
    env: process.env.NODE_ENV, // Default: 'development'
  },
});

// Add middleware that always respond 'Hello World!'
app.use(ctx => ctx.send('Hello World!'));

// Start listening
app.listen(process.env.PORT || 3000);
```

#### Transaction Context

Komapi creates a transaction context upon instantiation that is very useful for tracking context throughout the application. 
This context is most often used in the request-response cycle for keeping track of authentication, transaction-type and request-id in logs or even in code to make it context aware, without having to pass around a context object.

By default, Komapi creates a separate context for each request-response cycle through a custom middleware that is available on the `app.transactionContext` property.

Example middleware on how to access transaction context
```typescript
export default function logTransactionContextMiddleware(ctx, next) {
  // Example on how to utilize the transaction context to access variables.
  // You can also use transactionContext.set('myVar', 'myValue') to set transaction values that should be available in other parts of your application
  console.log(`Current requestId from transactionContext: ${ctx.app.transactionContext.get('requestId')}`);


  // In this example, the request id is also available from the middleware request object
  console.log(`Current requestId from ctx.request.requestId: ${ctx.request.requestId}`);
  
  // Continue
  return next();
}
```

If you need to use transaction context outside of a request-response cycle (e.g. in a script), then you can run your code in `app.run(() => myFunction())`.
Alternatively you can create the transaction context yourself and handle it manually. See [cls-hooked][cls-hooked-url] for more information. The existing namespace is available in `app.transactionContext`.

Example on how to utilize the transaction context outside of the request-response cycle
```typescript
import Komapi from 'komapi';
import { getNamespace } from 'cls-hooked';

// Create app isntance
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
  app.transactionContext.get('Foo', 'My Value');
  
  // Run my function
  await logTransactionContext();
  
  console.log('Done')
});
```


#### Services

Komapi has a concept of `services` which encapsulates re-usable stateful functionality and makes it available throughout the application.
Services can be as simple or as complex as needed for the application, and can be inter-connected and dependend on the context 


Komapi comes with sensible defaults, but allows for customizations for a wide variety of use cases. 

```typescript
import Komapi from 'komapi';

// Create app
const app = new Komapi({
  config: {
    env: process.env.NODE_ENV, // Default: 'development'
  },
});

// Add middleware that always respond 'Hello World!'
app.use(ctx => ctx.send('Hello World!'));

// Start listening
app.listen(process.env.PORT || 3000);
```

#### Types

You can provide your own types to override the default ones (e.g. services available on `app.services` and locals on `app.locals`) by augmenting the Komapi.

To set the services and/or locals interface you can use one of the following alternatives. The difference is that alternative 2 will provide type safety during class instantiation, but is more verbose.

```typescript
// Dependencies
import UserService from './services/User';

/**
 * Alternative 1
 * 
 * Less verbose, but not type safe `new Komapi({ services: ... })` instantiation (it is type safe on app.services though)
 */
declare module 'komapi' {
  interface Locals {
    myCustomProperty: string;
  }
  interface Services {
    User: UserService;
  }
}

/**
 * Alternative 2
 * 
 * More verbose, but type safe `new Komapi({ services: ... })` instantiation
 */
declare module 'komapi/dist/lib/Komapi' {
  interface Locals {
    myCustomProperty: string;
  }
  interface Services {
    User: UserService;
  }
}

const app = new Komapi({ services: ... });
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
