'use strict';

const Fastify = require('fastify');
const { apiDocs } = require('@usebruno/api-docs-fastify');

const PORT = Number(process.env.PORT || 5457);
// relative on purpose: the core resolves it against this file, not the cwd
const COLLECTION = process.env.COLLECTION || '../../../contract-tests/fixtures/api-collection';
const BUNDLED = process.env.BUNDLED || '../../../contract-tests/fixtures/bundled.yml';

const app = Fastify({ logger: false });


// the same strict CSP the Express example sets with helmet, by hand here so the example
// stays free of a plugin the contract does not depend on
app.addHook('onSend', async (request, reply) => {
  reply.header(
    'content-security-policy',
    "default-src 'self'; "
    + "script-src 'self' https://cdn.usebruno.com 'wasm-unsafe-eval'; "
    + "style-src 'self' 'unsafe-inline' https://cdn.usebruno.com https://fonts.googleapis.com; "
    + "font-src 'self' https://fonts.gstatic.com; "
    // data: because the renderer fetches its wasm sandbox from a data URI
    + "connect-src 'self' data:"
  );
});

async function main() {
  // swagger first and awaited: it only records routes registered after it loads, so a host that
  // registers it late publishes an empty spec
  await app.register(require('@fastify/swagger'), {
    openapi: { info: { title: 'Acme API', version: '1.0.0' } }
  });

  app.get('/control', async () => ({ ok: true, from: 'the app itself' }));
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  await app.register(apiDocs, {
    prefix: '/docs',
    collection: COLLECTION,
    environments: { include: ['Local'] },
    tags: { exclude: ['internal'] },
    pageTitle: 'Acme API',
    gitCollectionUrl: 'https://token:secret@github.com/acme/api-collection'
  });

  await app.register(apiDocs, {
    prefix: '/api/v2/docs',
    collection: COLLECTION,
    environments: { all: true, exclude: ['Prod'] }
  });

  await app.register(apiDocs, { prefix: '/internal/docs', collection: COLLECTION });
  await app.register(apiDocs, { prefix: '/bundled/docs', collection: BUNDLED });
  await app.register(apiDocs, { prefix: '/broken/docs', collection: './there-is-no-collection-here' });

  await app.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`fastify example on http://localhost:${PORT}`);
}

main();
