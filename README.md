# KomAPI

Komapi.js is an opinionated Node.js framework built on top of Koa 2.0

[![NPM Version][npm-image]][npm-url]
[![Build][travis-image]][travis-url]
[![coverage][codecov-image]][codecov-url]

### Usage
Install through npm and require it in your index.js file
`$ npm install --save komapi`
```js
'use strict';
const Komapi = require('komapi');
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

### Optional dependencies
##### Database access
Database access requires a database driver supported by `knex`. See [knex documentation](http://knexjs.org/#Installation)
for more information. This is a short list of supported drivers and how to install them:
```
$ npm install pg --save
$ npm install sqlite3 --save
$ npm install mysql --save
$ npm install mysql2 --save
$ npm install mssql --save
$ npm install mariasql --save
$ npm install strong-oracle --save
$ npm install oracle --save
```
##### Template rendering
Template rendering requires a template engine supported by `consolidate`. See [consolidate.js documentation](https://github.com/tj/consolidate.js#supported-template-engines)
for more information. Some common template engines are listed below for convenience:
```
$ npm install handlebars --save
$ npm install ejs --save
$ npm install jade --save
$ npm install nunjucks --save
$ npm install twig --save
```

### License

  [MIT](LICENSE.md)

[npm-image]: https://img.shields.io/npm/v/komapi.svg
[npm-url]: https://npmjs.org/package/komapi
[travis-image]: https://travis-ci.org/komapijs/komapi.svg?branch=master
[travis-url]: https://travis-ci.org/komapijs/komapi
[codecov-image]: https://img.shields.io/codecov/c/github/komapijs/komapi/master.svg
[codecov-url]: https://codecov.io/gh/komapijs/komapi