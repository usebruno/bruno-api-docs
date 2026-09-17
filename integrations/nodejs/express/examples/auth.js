'use strict';

const express = require('express');
const { apiDocs } = require('@usebruno/api-docs-express');

const app = express();
const port = process.env.PORT ?? 3000;

// stand-in for your real auth: a session check, an SSO middleware, whatever the app already uses
const requireToken = (req, res, next) => {
  if (req.headers.authorization !== 'Bearer let-me-in') {
    res.set('WWW-Authenticate', 'Bearer').sendStatus(401);
    return;
  }

  next();
};

app.get('/health', (req, res) => res.json({ ok: true }));

// the guard runs before the docs on this mount and nowhere else. It covers collection.yml too,
// which is the file that carries the collection's own auth and variables.
app.use('/docs', requireToken, apiDocs({ collection: './api-collection' }));

app.listen(port, () => console.log(`docs at http://localhost:${port}/docs/ (Authorization: Bearer let-me-in)`));
