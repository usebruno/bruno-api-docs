'use strict';

const Fastify = require('fastify');
const { apiDocs } = require('@usebruno/api-docs-fastify');

const app = Fastify();
const port = process.env.PORT ?? 3000;

app.get('/health', async () => ({ ok: true }));

// a hook is scoped to the plugin it is added in, so a wrapper plugin is the Fastify way to put a
// guard in front of the docs and nothing else. It covers collection.yml too, which is the file
// that carries the collection's own auth and variables.
app.register(async (guarded) => {
  guarded.addHook('onRequest', async (request, reply) => {
    // stand-in for your real auth: a session check, a JWT plugin, whatever the app already uses
    if (request.headers.authorization !== 'Bearer let-me-in') {
      return reply.code(401).header('www-authenticate', 'Bearer').send();
    }
  });

  await guarded.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });
});

app.listen({ port }).then(() => console.log(`docs at http://localhost:${port}/docs/ (Authorization: Bearer let-me-in)`));
