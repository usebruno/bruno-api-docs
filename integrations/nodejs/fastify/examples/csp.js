'use strict';

const Fastify = require('fastify');
const { apiDocs } = require('@usebruno/api-docs-fastify');

const app = Fastify();
const port = process.env.PORT ?? 3000;

// what the docs page needs from a strict CSP. 'self' covers shell.js; the renderer itself comes
// from cdn.usebruno.com and runs a wasm sandbox, which is what 'wasm-unsafe-eval' and data: are for.
// The response viewer is Monaco, loaded from cdn.jsdelivr.net when "try it" opens, with its workers.
// Without these the page still loads and looks fine, and the errors are only in the console.
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

app.get('/health', async () => ({ ok: true }));

app.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });

app.listen({ port }).then(() => console.log(`docs at http://localhost:${port}/docs/`));
