'use strict';

// the host a `url` mount fetches from, in the rigs and the browser run: the fixtures over plain http
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.PORT || 6456);
const ROOT = path.join(__dirname, 'fixtures');

http.createServer((req, res) => {
  const file = path.join(ROOT, path.normalize(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200);
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`fixtures on http://127.0.0.1:${PORT}`));
