'use strict';

const Fastify = require('fastify');
const { apiDocs } = require('@usebruno/api-docs-fastify');

const app = Fastify();
const port = process.env.PORT ?? 3000;

app.get('/health', async () => ({ ok: true }));

// prefix is the mount. The collection path is relative to this file, not to where node was started.
app.register(apiDocs, { prefix: '/docs', collection: './api-collection' });

app.listen({ port }).then(() => console.log(`docs at http://localhost:${port}/docs/`));
