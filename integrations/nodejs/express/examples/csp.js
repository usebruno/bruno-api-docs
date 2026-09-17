'use strict';

const express = require('express');
const helmet = require('helmet');
const { apiDocs } = require('@usebruno/api-docs-express');

const app = express();
const port = process.env.PORT ?? 3000;

// what the docs page needs from a strict CSP. 'self' covers shell.js; the renderer itself comes
// from cdn.usebruno.com and runs a wasm sandbox, which is what 'wasm-unsafe-eval' and data: are for.
// Without these the page still loads and looks fine, and the errors are only in the console.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", 'https://cdn.usebruno.com', "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'data:']
    }
  }
}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/docs', apiDocs({ collection: './api-collection' }));

app.listen(port, () => console.log(`docs at http://localhost:${port}/docs/`));
