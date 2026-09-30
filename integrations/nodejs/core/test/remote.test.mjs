// `url`: a bundled collection file at a public address, fetched once at boot. The fetch is exercised
// against a local http server so the test needs no network; the https rule is checked on the parser.
// Run: npm run test:unit
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(here, '..', 'dist');
const { parseCollectionUrl, fetchBundled, RemoteError } = require(path.join(dist, 'collection', 'remote.js'));
const { errorProvider } = require(path.join(dist, 'collection', 'providers.js'));
const { CapError } = require(path.join(dist, 'collection', 'walk.js'));
const { ConfigError } = require(path.join(dist, 'options.js'));
const thrownBy = (fn) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
};

// --- what the option accepts
{
  assert.equal(parseCollectionUrl('https://example.com/api/opencollection.yml'), 'https://example.com/api/opencollection.yml');
  assert.equal(parseCollectionUrl('https://cdn.example.com/v1/collection.yaml?x=1'), 'https://cdn.example.com/v1/collection.yaml?x=1');
  assert.equal(parseCollectionUrl('https://example.com/api/collection.JSON'), 'https://example.com/api/collection.JSON');

  const warned = [];
  const { warn } = console;
  console.warn = (line) => warned.push(line);
  try {
    assert.equal(parseCollectionUrl('https://user:tok@example.com/c.yml'), 'https://example.com/c.yml', 'credentials are dropped, the file is public by contract');
  } finally {
    console.warn = warn;
  }
  assert.ok(warned.some((line) => line.includes('credentials in `url` were ignored')), 'and it says so');

  assert.throws(() => parseCollectionUrl('http://example.com/c.yml'), /must be https/);
  assert.equal(parseCollectionUrl('http://127.0.0.1:6456/bundled.yml'), 'http://127.0.0.1:6456/bundled.yml', 'plain http only to this machine');
  assert.throws(() => parseCollectionUrl('not a url'), /is not a URL/);
  assert.throws(() => parseCollectionUrl('https://github.com/acme/api'), /bundled collection file/, 'a repository is not a file');
  assert.throws(() => parseCollectionUrl('https://github.com/acme/api/tree/main/collection'), /bundled collection file/, 'nor is a folder in it');
}

// --- the fetch, against a local server standing in for the host. It lives in its own process:
// the fetch is synchronous in ours, so a server here would never get to answer.
const bundledPath = path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', 'bundled.yml');
const bundled = fs.readFileSync(bundledPath, 'utf8');
const serverScript = `
const http = require('node:http');
const bundled = require('node:fs').readFileSync(process.argv[1], 'utf8');
const routes = {
  '/bundled.yml': [200, bundled],
  '/as.json': [200, JSON.stringify({ opencollection: '1.0.0', info: { name: 'J' }, items: [] })],
  '/manifest.yml': [200, 'opencollection: 1.0.0\\nbundled: false\\n'],
  '/huge.yml': [200, 'x'.repeat(6 * 1024 * 1024)],
  '/moved.yml': [302, '', { Location: '/bundled.yml' }]
};
http.createServer((req, res) => {
  const [status, body, headers = {}] = routes[req.url] ?? [404, 'no'];
  res.writeHead(status, headers);
  res.end(body);
}).listen(0, '127.0.0.1', function () { console.log(this.address().port); });
`;
const server = spawn(process.execPath, ['-e', serverScript, bundledPath], { stdio: ['ignore', 'pipe', 'inherit'] });
const port = await new Promise((resolve) => server.stdout.once('data', (chunk) => resolve(String(chunk).trim())));
const base = `http://127.0.0.1:${port}`;

try {
  assert.equal(fetchBundled(`${base}/bundled.yml`), bundled, 'the document, byte for byte');
  assert.match(fetchBundled(`${base}/as.json`), /"name":"J"/, 'JSON is a bundled document too');
  assert.equal(fetchBundled(`${base}/moved.yml`), bundled, 'a redirect is followed');

  const manifest = thrownBy(() => fetchBundled(`${base}/manifest.yml`));
  assert.ok(manifest instanceof ConfigError, 'the manifest of a directory collection is refused, not served empty');
  assert.match(manifest.message, /bundled collection/);

  const missing = thrownBy(() => fetchBundled(`${base}/missing.yml`));
  assert.ok(missing instanceof RemoteError);
  assert.match(missing.message, /HTTP 404/);
  assert.equal(errorProvider(missing)({}).status, 404, 'a fetch that fails is a 404 with the reason');

  const huge = thrownBy(() => fetchBundled(`${base}/huge.yml`));
  assert.ok(huge instanceof CapError, 'over the cap is refused like a file on disk');
  assert.equal(errorProvider(huge)({}).status, 413);

  const down = thrownBy(() => fetchBundled('http://127.0.0.1:1/c.yml'));
  assert.ok(down instanceof RemoteError, 'a host that does not answer');
} finally {
  server.kill();
}

console.log('remote-test: all assertions passed');
