'use strict';

const express = require('express');
const { apiDocs } = require('@usebruno/api-docs-express');

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/health', (req, res) => res.json({ ok: true }));

// the path is relative to this file, not to where node was started
app.use('/docs', apiDocs({ collectionPath: './api-collection' }));

app.listen(port, () => console.log(`docs at http://localhost:${port}/docs/`));
