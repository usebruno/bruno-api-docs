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
const BRU = '../fixtures/api-collection-bru';
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
      logo: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%225%22/%3E%3C/svg%3E',
      gitCollectionUrl: 'https://token:secret@github.com/acme/api-collection'
    }),
    ApiDocsModule.forRoot({
      mountPath: '/api/v2/docs',
      collection: COLLECTION,
      environments: { include: '*', exclude: ['Prod'] }
    }),
    ApiDocsModule.forRoot({ mountPath: '/internal/docs', collection: COLLECTION }),
    ApiDocsModule.forRoot({ mountPath: '/bundled/docs', collection: BUNDLED }),
    ApiDocsModule.forRoot({ mountPath: '/bru/docs', collection: BRU, environments: { include: ['Local'] }, tags: { exclude: ['internal'] } }),
    ApiDocsModule.forRoot({ mountPath: '/broken/docs', collection: './there-is-no-collection-here' }),
    ApiDocsModule.forRoot({ mountPath: '/oversize/docs', collection: '../fixtures/walk-oversize' }),
    ApiDocsModule.forRoot({ mountPath: '/misconfigured/docs', collection: COLLECTION, theme: 'dark' })
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
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
        connectSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net']
      }
    }
  }));

  // the host's own route, straight on the adapter: both adapters take (req, res) and both `.send`
  app.getHttpAdapter().get('/control', (req, res) => res.send({ ok: true, from: 'the app itself' }));

  await app.listen(PORT, '127.0.0.1');
  console.log(`nestjs rig on http://localhost:${PORT} (platform-${ADAPTER})`);
}

main();
