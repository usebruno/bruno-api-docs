'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Fastify = require('fastify');
const { apiDocs } = require('@usebruno/api-docs-fastify');

const PORT = Number(process.env.PORT || 5457);
// relative on purpose: the core resolves it against this file, not the cwd
const COLLECTION = '../fixtures/api-collection';
const BRU = '../fixtures/api-collection-bru';
const BUNDLED = '../fixtures/bundled.yml';
const CONTENT = fs.readFileSync(path.join(__dirname, BUNDLED), 'utf8');
const URL_FIXTURE = process.env.URL_FIXTURE;

const app = Fastify({ logger: false });

// the same CSP the Express rig sets with helmet, by hand so the rig stays free of a plugin the
// contract does not depend on
app.addHook('onSend', async (request, reply) => {
  reply.header(
    'content-security-policy',
    "default-src 'self'; "
    + "script-src 'self' https://cdn.usebruno.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'; "
    + "style-src 'self' 'unsafe-inline' https://cdn.usebruno.com https://cdn.jsdelivr.net https://fonts.googleapis.com; "
    + "font-src 'self' data: https://fonts.gstatic.com; "
    + "worker-src 'self' blob: https://cdn.jsdelivr.net; "
    + "connect-src 'self' data: https://cdn.jsdelivr.net"
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
    collectionPath: COLLECTION,
    environments: { include: ['Local'] },
    tags: { exclude: ['internal'] },
    pageTitle: 'Acme API',
    logo: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%225%22/%3E%3C/svg%3E',
    repositoryUrl: 'https://token:secret@github.com/acme/api-collection'
  });

  await app.register(apiDocs, {
    prefix: '/api/v2/docs',
    collectionPath: COLLECTION,
    environments: { include: '*', exclude: ['Prod'] }
  });

  await app.register(apiDocs, { prefix: '/internal/docs', collectionPath: COLLECTION });
  await app.register(apiDocs, { prefix: '/bundled/docs', collectionPath: BUNDLED });
  await app.register(apiDocs, { prefix: '/content/docs', content: CONTENT });
  await app.register(apiDocs, { prefix: '/priority/docs', content: CONTENT, collectionPath: COLLECTION });
  if (URL_FIXTURE) {
    await app.register(apiDocs, { prefix: '/url/docs', url: URL_FIXTURE });
    await app.register(apiDocs, { prefix: '/url-missing/docs', url: URL_FIXTURE.replace('bundled.yml', 'missing.yml') });
  }
  await app.register(apiDocs, { prefix: '/bru/docs', collectionPath: BRU, environments: { include: ['Local'] }, tags: { exclude: ['internal'] } });
  await app.register(apiDocs, { prefix: '/broken/docs', collectionPath: './there-is-no-collection-here' });
  await app.register(apiDocs, { prefix: '/oversize/docs', collectionPath: '../fixtures/walk-oversize' });
  await app.register(apiDocs, { prefix: '/misconfigured/docs', collectionPath: COLLECTION, theme: 'dark' });

  await app.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`fastify rig on http://localhost:${PORT}`);
}

main();
