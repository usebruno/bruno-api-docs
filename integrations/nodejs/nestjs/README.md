# @usebruno/api-docs-nestjs

Serve a Bruno collection as API docs from your own NestJS app.

```
npm install @usebruno/api-docs-nestjs
```

## Mount

```ts
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';

@Module({
  imports: [ApiDocsModule.forRoot({ collectionPath: '../api-collection' })]
})
export class AppModule {}
```

Open `http://localhost:<port>/docs/`. The path counts from `dist/main.js`, so a collection beside `src/` is `'../api-collection'`.

`mountPath` defaults to `'/docs'`. A global prefix moves the docs with everything else. Both adapters work.

## Options

```ts
ApiDocsModule.forRoot({
  collectionPath: '../api-collection',
  mountPath: '/docs',
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

## Auth

The docs are middleware, so guards do not run on them. Put your own middleware on the mount in the root module. It covers the collection file too.

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requireLogin).forRoutes('docs', 'docs/*splat');
  }
}
```

On Nest 10 the wildcard is `'docs/*'`.

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

```ts
import { embed } from '@usebruno/api-docs-nestjs';

@Get()
@Header('Content-Type', 'text/html; charset=utf-8')
portal(): string {
  return `<h1>Acme</h1>${embed({ base: '/docs' })}`;
}
```

## Requirements

Node 20 or later. NestJS 10, 11 or 12.

Examples: [`examples/`](https://github.com/usebruno/bruno-api-docs/tree/main/examples/integrations/nodejs/nestjs)
