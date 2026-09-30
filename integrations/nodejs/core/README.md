# @usebruno/api-docs-core

The Node core behind the Bruno API docs packages. It reads a Bruno collection, applies the filters and serves the docs.

You want a wrapper:

- [`@usebruno/api-docs-express`](https://www.npmjs.com/package/@usebruno/api-docs-express)
- [`@usebruno/api-docs-fastify`](https://www.npmjs.com/package/@usebruno/api-docs-fastify)
- [`@usebruno/api-docs-nestjs`](https://www.npmjs.com/package/@usebruno/api-docs-nestjs)

Use the core directly for a framework without one.

```
npm install @usebruno/api-docs-core
```

## Use

```js
const http = require('node:http');
const { createDocs } = require('@usebruno/api-docs-core');

const handler = createDocs({ collectionPath: './api-collection' }).handler();

http.createServer((req, res) => {
  if (req.url.startsWith('/docs')) {
    req.url = req.url.slice('/docs'.length) || '/';
    return handler(req, res);
  }
  res.statusCode = 404;
  res.end();
}).listen(3000);
```

`handler()` expects the mount already stripped. It serves `/shell.js`, `/collection.yml` and the page for every other path. `docs.shell(base)`, `docs.shellJs()` and `docs.collection()` return `{ status, headers, body }` for a framework that writes responses itself.

## Options

```js
createDocs({
  collectionPath: './api-collection',
  environments: { include: ['Local'] },
  tags: { exclude: ['internal'] },
  pageTitle: 'Acme API',
  logo: 'https://acme.dev/logo.svg',
  gitCollectionUrl: 'https://github.com/acme/api-collection'
})
```

`collectionPath` is the path to a Bruno folder (`bruno.json` and `.bru` files), an OpenCollection yml folder or one bundled `.yml` file. The path is relative to your app's entry file.

`url` is the public address of a bundled collection file, `https://example.com/api/opencollection.yml`, fetched once at start.

`content` is the document itself as a string. When more than one source is set the first of `content`, `url`, `collectionPath` wins.

`environments` and `tags` take `{ include, exclude }`, where `include` is a list of names or `'*'`. Leave `environments` out and none are published. Excluded tags drop their requests from the served collection.

## The page

The page loads `shell.js` from the mount and the renderer from `https://cdn.usebruno.com`. An app with a Content Security Policy needs the block from any wrapper's README. `embed({ base: '/docs' })` returns the block for a page of your own.

## Requirements

Node 20 or later.
