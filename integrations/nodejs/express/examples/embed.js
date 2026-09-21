'use strict';

const express = require('express');
const { apiDocs, embed } = require('@usebruno/api-docs-express');

const app = express();
const port = process.env.PORT ?? 3000;

// the docs inside a page of your own. The mount serves the collection and shell.js; the block
// only has to know where the mount is.
app.use('/docs', apiDocs({ collectionPath: './api-collection' }));

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Acme Developer Portal</title></head>
<body>
  <h1>Acme Developer Portal</h1>
  ${embed({ base: '/docs' })}
</body>
</html>`);
});

app.listen(port, () => console.log(`portal at http://localhost:${port}/`));
