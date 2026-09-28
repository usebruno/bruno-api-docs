# @usebruno/api-docs-express

Serve a Bruno collection as API docs from your own Express app.

```
npm install @usebruno/api-docs-express
```

## Mount

```js
const { apiDocs } = require('@usebruno/api-docs-express');

app.use('/docs', apiDocs({ collectionPath: './api-collection' }));
```

Open `http://localhost:<port>/docs/`.

## Options

```js
apiDocs({
  collectionPath: './api-collection',
  environments: { include: ['Local'] },
  tags: { exclude: ['internal'] },
  pageTitle: 'Acme API',
  logo: 'https://acme.dev/logo.svg',
  gitCollectionUrl: 'https://github.com/acme/api-collection'
})
```

`collectionPath` is the path to a Bruno folder (`bruno.json` and `.bru` files), an OpenCollection yml folder or one bundled `.yml` file. The path is relative to your app's entry file.

`content` is the document itself as a string, instead of a path. When both are set, `content` wins.

`environments` and `tags` take `{ include, exclude }`, where `include` is a list of names or `'*'`. Leave `environments` out and none are published. Excluded tags drop their requests from the served collection.

## Auth

Put your guard in front of the mount. It covers the collection file too.

```js
app.use('/docs', requireLogin, apiDocs({ collectionPath: './api-collection' }));
```

## Content Security Policy

If the app sets one, add these.

```
script-src  'self' https://cdn.usebruno.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'
style-src   'self' 'unsafe-inline' https://cdn.usebruno.com https://cdn.jsdelivr.net https://fonts.googleapis.com
font-src    'self' data: https://fonts.gstatic.com
worker-src  'self' blob: https://cdn.jsdelivr.net
connect-src 'self' data: https://cdn.jsdelivr.net
```

## Inside your own page

```js
const { apiDocs, embed } = require('@usebruno/api-docs-express');

app.use('/docs', apiDocs({ collectionPath: './api-collection' }));
app.get('/', (req, res) => res.type('html').send(`<h1>Acme</h1>${embed({ base: '/docs' })}`));
```

## Requirements

Node 20 or later. Express 4 or 5.

Examples: [`examples/`](https://github.com/usebruno/bruno-api-docs/tree/main/integrations/nodejs/express/examples)
