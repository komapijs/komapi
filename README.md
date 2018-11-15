# KomAPI

Komapi is an opinionated Node.js framework with official typescript support built on top of Koa v2.5 and requires Node.js v8.11.1 or higher.
 
Disclaimer: There will be breaking changes and outdated documentation during the pre-v1.0.0 cycles.

[![npm](https://img.shields.io/npm/v/komapi.svg)](https://npmjs.org/package/komapi)
[![CircleCI](https://img.shields.io/circleci/project/github/komapijs/komapi/master.svg)](https://circleci.com/gh/komapijs/komapi/tree/master)
[![Codecov branch](https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg)](https://codecov.io/gh/komapijs/komapi/tree/master)
[![David](https://img.shields.io/david/komapijs/komapi/master.svg)](https://david-dm.org/komapijs/komapi/master)
[![Known Vulnerabilities](https://snyk.io/test/github/komapijs/komapi/master/badge.svg)](https://snyk.io/test/github/komapijs/komapi/master)
[![renovate-app badge](https://img.shields.io/badge/renovate-app-blue.svg)](https://renovateapp.com/)
[![license](https://img.shields.io/github/license/komapijs/komapi.svg)](https://github.com/komapijs/komapi/blob/master/LICENSE.md)

Komapi is essentially Koa+typescript with some added sugar, which means that you can use any Koa compatible middleware and use the Koa documentation as reference. Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to use this exactly as you would use Koa.

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

```js
const app = new Komapi({
  config: {
    env: process.env.NODE_ENV, // Default: 'development'
  },
});
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

### API
#### Komapi
`new Komapi([options])`

##### Parameters:
+ `options` (object): Object with options
  * `env` (string): Environment setting - it is **highly** recommended to set this to `NODE_ENV`. Default: `development`
  * `name` (string): The name of the application. Default: `Komapi application`
  * `subdomainOffset` (number): Offset of .subdomains to ignore. See [Koa documentation for more information](https://koajs.com/#settings). Default: `2`
  * `proxy` (boolean): Trust proxy headers (includes `x-request-id`). See [Koa documentation for more information](https://koajs.com/#settings). Default: `false`
  * `logOptions` (object): Options to pass down to the [Pino](https://github.com/pinojs/pino) logger instance. See [Pino documentation for more information](https://github.com/pinojs/pino)
  * `logStream` (Writable): A writable stream to receive logs. Default: `process.stdout`

### License

  [MIT](LICENSE.md)
