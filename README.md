# KomAPI

Komapi is an opinionated Node.js framework with official typescript support built on top of Koa v2.5 and requires Node.js v8.11.1 or higher.
 
Disclaimer: There will be breaking changes and outdated documentation during the pre-v1.0.0 cycles.

[![npm](https://img.shields.io/npm/v/komapi.svg)](https://npmjs.org/package/komapi)
[![Travis](https://img.shields.io/travis/komapijs/komapi/master.svg)](https://travis-ci.com/komapijs/komapi)
[![Known Vulnerabilities](https://snyk.io/test/github/komapijs/komapi/badge.svg)](https://snyk.io/test/github/komapijs/komapi)
[![Codecov branch](https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg)](https://codecov.io/gh/komapijs/komapi)
[![David](https://img.shields.io/david/komapijs/komapi.svg)]()
[![npm](https://img.shields.io/npm/l/komapi.svg)](https://github.com/komapijs/komapi/blob/master/LICENSE.md)

Komapi is essentially Koa+typescript with some added sugar, which means that you can use any Koa compatible middleware and use the Koa documentation as reference. Even though it is recommended to follow the conventions defined in the framework, it is entirely possible to use this exactly as you would use Koa.

## Usage
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Tips](#tips)
- [License](#license)
  
### Installation
Install through npm and require it in your `index.js` file.
```bash
$ npm install --save komapi
```

### Usage
Komapi requires you to be explicit about the environment and set it to `NODE_ENV` during instantiation. This is to encourage use of the `NODE_ENV` environment variable that many libraries depend on.

```js
const app = new Komapi({
  env: process.env.NODE_ENV, // Default: 'development'
});
```

### API
#### Komapi
`new Komapi([options], [locals], [secrets])`

##### Parameters:
+ `options` (object): Available under `app.config`
  * `env` (string): Environment setting - it is **highly** recommended to set this to `NODE_ENV`. Default: `development`
  * `name` (string): The name of the application. Default: `Komapi application`
  * `subdomainOffset` (number): Offset of .subdomains to ignore. See [Koa documentation for more information](https://koajs.com/#settings). Default: `2`
  * `proxy` (boolean): Trust proxy headers (includes `x-request-id`). See [Koa documentation for more information](https://koajs.com/#settings). Default: `false`
  * `logOptions` (object): Options to pass down to the [Pino](https://github.com/pinojs/pino) logger instance. See [Pino documentation for more information](https://github.com/pinojs/pino)
  * `logStream` (Writable): A writable stream to receive logs. Default: `process.stdout`
  * `instanceId` (string): A unique identifier to identify the specific instance of the application. Defaults to generating a unique uuidv4 string
+ `locals` (any): Convenient place to put all custom configuration. Available under `app.state.locals`
+ `secrets` (object): Convenient and secure place to put all secrets, API keys and sensitive application-wide information. This is never leaked in logs or stack traces. Available under `app.state.secrets`

### Tips
1. For better performance, add the following line before any import statements in your main application file `global.Promise = require('babel-runtime/core-js/promise').default = require('bluebird');`. This enables usage of Bluebird promises by default and significantly improves performance.

### License

  [MIT](LICENSE.md)
