'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { apiDocs } = require('@usebruno/api-docs-express');

const PORT = Number(process.env.PORT || 5456);
// relative on purpose: the core resolves it against this file, not the cwd, and check.sh
// boots from a different directory to prove it. COLLECTION overrides it for pack-and-install,
// which runs this example from a temp dir with the packages installed from tarballs.
const COLLECTION = process.env.COLLECTION || '../../../contract-tests/fixtures/api-collection';
const BUNDLED = process.env.BUNDLED || '../../../contract-tests/fixtures/bundled.yml';

const app = express();

// a strict CSP. scripts: 'self' covers shell.js, the CDN serves the renderer.
// styles still need 'unsafe-inline' and Google Fonts until the renderer stops injecting its own.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://cdn.usebruno.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"]
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
  gitCollectionUrl: 'https://token:secret@github.com/acme/api-collection'
}));

app.use('/api/v2/docs', apiDocs({ collection: COLLECTION, environments: { all: true, exclude: ['Prod'] } }));

app.use('/internal/docs', apiDocs({ collection: COLLECTION }));

app.use('/bundled/docs', apiDocs({ collection: BUNDLED }));

app.use('/broken/docs', apiDocs({ collection: './there-is-no-collection-here' }));

app.listen(PORT, () => {
  console.log(`express example on http://localhost:${PORT}`);
  console.log('  /docs/           Local only, internal-tagged requests hidden');
  console.log('  /api/v2/docs/    every environment except Prod');
  console.log('  /internal/docs/  defaults: no environments, every request');
  console.log('  /bundled/docs/   a single bundled yml');
  console.log('  /broken/docs/    a collection that is not there, to prove the app still starts');
});
