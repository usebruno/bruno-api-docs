'use strict';

const Fastify = require('fastify');
const { apiDocs, embed } = require('@usebruno/api-docs-fastify');

const app = Fastify();
const port = process.env.PORT ?? 3000;

// the docs inside a page of your own. The mount serves the collection and shell.js; the block
// only has to know where the mount is.
app.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });

app.get('/', async (request, reply) => {
  return reply.type('text/html').send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Acme Developer Portal</title></head>
<body>
  <h1>Acme Developer Portal</h1>
  ${embed({ base: '/docs' })}
</body>
</html>`);
});

app.listen({ port }).then(() => console.log(`portal at http://localhost:${port}/`));
