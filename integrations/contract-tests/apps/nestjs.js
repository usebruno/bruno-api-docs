'use strict';

require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const helmet = require('helmet');
const { ApiDocsModule } = require('@usebruno/api-docs-nestjs');

const PORT = Number(process.env.PORT || 5458);
// ADAPTER=fastify runs the same app on platform-fastify. The wrapper is unchanged between them;
// what differs is that middie leaves req.url as '/', which is why the mount path is an option.
const ADAPTER = process.env.ADAPTER || 'express';
// relative on purpose: the core resolves it against this file, not the cwd
const COLLECTION = '../fixtures/api-collection';
const BUNDLED = '../fixtures/bundled.yml';

// plain JS, so the decorator is applied as the function it is. The real Nest examples live in
// nodejs/nestjs/examples and are TypeScript.
class AppModule {}
Module({
  imports: [
    ApiDocsModule.forRoot({
      mountPath: '/docs',
      collection: COLLECTION,
      environments: { include: ['Local'] },
      tags: { exclude: ['internal'] },
      pageTitle: 'Acme API',
      gitCollectionUrl: 'https://token:secret@github.com/acme/api-collection'
    }),
    ApiDocsModule.forRoot({
      mountPath: '/api/v2/docs',
      collection: COLLECTION,
      environments: { all: true, exclude: ['Prod'] }
    }),
    ApiDocsModule.forRoot({ mountPath: '/internal/docs', collection: COLLECTION }),
    ApiDocsModule.forRoot({ mountPath: '/bundled/docs', collection: BUNDLED }),
    ApiDocsModule.forRoot({ mountPath: '/broken/docs', collection: './there-is-no-collection-here' })
  ]
})(AppModule);

async function main() {
  let app;
  if (ADAPTER === 'fastify') {
    const { FastifyAdapter } = require('@nestjs/platform-fastify');
    app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  } else {
    app = await NestFactory.create(AppModule, { logger: false });
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'data:']
      }
    }
  }));

  // the host's own route, straight on the adapter: both adapters take (req, res) and both `.send`
  app.getHttpAdapter().get('/control', (req, res) => res.send({ ok: true, from: 'the app itself' }));

  await app.listen(PORT, '127.0.0.1');
  console.log(`nestjs rig on http://localhost:${PORT} (platform-${ADAPTER})`);
}

main();
