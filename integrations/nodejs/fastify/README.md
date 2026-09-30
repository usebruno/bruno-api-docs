# @usebruno/api-docs-fastify

Serve a Bruno collection as API docs from your own Fastify app.

```
npm install @usebruno/api-docs-fastify
```

## Mount

```js
const { apiDocs } = require('@usebruno/api-docs-fastify');

app.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });
```

Open `http://localhost:<port>/docs/`. The plugin is encapsulated and its routes are hidden from `@fastify/swagger`.

## Options

```js
app.register(apiDocs, {
  prefix: '/docs',
  collectionPath: './api-collection',
  environments: { include: ['Local'] },
  tags: { exclude: ['internal'] },
  pageTitle: 'Acme API',
  logo: 'https://acme.dev/logo.svg',
  gitCollectionUrl: 'https://github.com/acme/api-collection'
});
```

`collectionPath` is the path to a Bruno folder (`bruno.json` and `.bru` files), an OpenCollection yml folder or one bundled `.yml` file. The path is relative to your app's entry file.

`url` is the public address of a bundled collection file, `https://example.com/api/opencollection.yml`, fetched once at start.

`content` is the document itself as a string. When more than one source is set the first of `content`, `url`, `collectionPath` wins.

`environments` and `tags` take `{ include, exclude }`, where `include` is a list of names or `'*'`. Leave `environments` out and none are published. Excluded tags drop their requests from the served collection.

## Auth

Register the docs inside a plugin that has your guard as a hook. It covers the collection file too.

```js
app.register(async (guarded) => {
  guarded.addHook('onRequest', async (request, reply) => {
    if (!isLoggedIn(request)) {
      return reply.code(401).send();
    }
  });
  await guarded.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });
});
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
const { apiDocs, embed } = require('@usebruno/api-docs-fastify');

app.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });
app.get('/', async (request, reply) => reply.type('text/html').send(`<h1>Acme</h1>${embed({ base: '/docs' })}`));
```

## Requirements

Node 20 or later. Fastify 4 or 5.

Examples: [`examples/`](https://github.com/usebruno/bruno-api-docs/tree/main/examples/integrations/nodejs/fastify)
