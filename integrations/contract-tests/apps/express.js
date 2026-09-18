'use strict';

const express = require('express');
const helmet = require('helmet');
const { apiDocs, embed } = require('@usebruno/api-docs-express');

const PORT = Number(process.env.PORT || 5456);
// relative on purpose: the core resolves it against this file, not the cwd, and check.sh boots
// from a different directory to prove it
const COLLECTION = '../fixtures/api-collection';
const BUNDLED = '../fixtures/bundled.yml';

const app = express();

// the CSP the README documents: 'self' covers shell.js, the CDN serves the renderer, and the
// renderer's wasm sandbox needs 'wasm-unsafe-eval' to instantiate and data: to be fetched
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'data:']
      }
    }
  })
);

app.get('/control', (req, res) => res.json({ ok: true, from: 'the app itself' }));

app.use('/docs', apiDocs({
  collection: COLLECTION,
  environments: { include: ['Local'] },
  tags: { exclude: ['internal'] },
  pageTitle: 'Acme API',
  logo: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%225%22/%3E%3C/svg%3E',
  gitCollectionUrl: 'https://token:secret@github.com/acme/api-collection'
}));

app.use('/api/v2/docs', apiDocs({ collection: COLLECTION, environments: { all: true, exclude: ['Prod'] } }));

app.use('/internal/docs', apiDocs({ collection: COLLECTION }));

app.use('/bundled/docs', apiDocs({ collection: BUNDLED }));

app.use('/broken/docs', apiDocs({ collection: './there-is-no-collection-here' }));

app.use('/oversize/docs', apiDocs({ collection: '../fixtures/walk-oversize' }));

// theme is what the renderer will take next; until it does, passing it is a mistake we report
app.use('/misconfigured/docs', apiDocs({ collection: COLLECTION, theme: 'dark' }));

// the docs inside the host's own page: the mount serves, the block only points at it
app.use('/portal/docs', apiDocs({ collection: COLLECTION, environments: { include: ['Local'] } }));
app.get('/portal', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Acme Developer Portal</title></head>
<body>
  <h1>Acme Developer Portal</h1>
  ${embed({ base: '/portal/docs' })}
</body></html>`);
});

app.listen(PORT, () => {
  console.log(`express rig on http://localhost:${PORT}`);
});
