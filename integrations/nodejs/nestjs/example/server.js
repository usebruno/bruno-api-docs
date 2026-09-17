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
const COLLECTION = process.env.COLLECTION || '../../../contract-tests/fixtures/api-collection';
const BUNDLED = process.env.BUNDLED || '../../../contract-tests/fixtures/bundled.yml';

class ControlController {
  control() {
    return { ok: true, from: 'the app itself' };
  }
}
class AppModule {}

function defineApp() {
  const { Controller, Get } = require('@nestjs/common');

  // the decorators, applied by hand: this example is plain JS so that it runs with no build step
  Get('control')(
    ControlController.prototype,
    'control',
    Object.getOwnPropertyDescriptor(ControlController.prototype, 'control')
  );
  Controller()(ControlController);

  Module({
    controllers: [ControlController],
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
}

async function main() {
  defineApp();

  let app;
  if (ADAPTER === 'fastify') {
    const { FastifyAdapter } = require('@nestjs/platform-fastify');
    app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  } else {
    app = await NestFactory.create(AppModule, { logger: false });
  }

  // the same strict CSP the other examples set, so the contract suite asserts it everywhere
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // wasm-unsafe-eval, narrowly, because the renderer instantiates a wasm sandbox
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // data: because the renderer fetches its wasm sandbox from a data URI
        connectSrc: ["'self'", 'data:']
      }
    }
  }));

  await app.listen(PORT, '127.0.0.1');
  console.log(`nestjs example on http://localhost:${PORT} (platform-${ADAPTER})`);
}

main();
