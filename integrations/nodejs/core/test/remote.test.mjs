// `url`: a bundled collection file at a public address, fetched once at boot. The fixture is this
// repo's own, on GitHub, pinned to a commit so it cannot drift. Needs the network, like the browser run.
// Run: npm run test:unit
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(here, '..', 'dist');
const { parseCollectionUrl, fetchBundled, RemoteError } = require(path.join(dist, 'collection', 'remote.js'));
const { errorProvider } = require(path.join(dist, 'collection', 'providers.js'));
const { ConfigError } = require(path.join(dist, 'options.js'));
const thrownBy = (fn) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
};

const FIXTURES = 'https://raw.githubusercontent.com/usebruno/bruno-api-docs/1aa76e1ad567b6e05e03e46ee53fb6bc1a66e7d5/integrations/contract-tests/fixtures';
const bundled = fs.readFileSync(path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', 'bundled.yml'), 'utf8');

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
  assert.throws(() => parseCollectionUrl('not a url'), /is not a URL/);
  assert.throws(() => parseCollectionUrl('https://github.com/acme/api'), /bundled collection file/, 'a repository is not a file');
  assert.throws(() => parseCollectionUrl('https://github.com/acme/api/tree/main/collection'), /bundled collection file/, 'nor is a folder in it');
}

// --- the fetch
{
  assert.equal(fetchBundled(`${FIXTURES}/bundled.yml`), bundled, 'the document, byte for byte');
  assert.equal(fetchBundled('https://github.com/usebruno/bruno-api-docs/raw/1aa76e1ad567b6e05e03e46ee53fb6bc1a66e7d5/integrations/contract-tests/fixtures/bundled.yml'), bundled, 'a redirect is followed');

  const manifest = thrownBy(() => fetchBundled(`${FIXTURES}/api-collection/opencollection.yml`));
  assert.ok(manifest instanceof ConfigError, 'the manifest of a directory collection is refused, not served empty');
  assert.match(manifest.message, /bundled collection/);

  const missing = thrownBy(() => fetchBundled(`${FIXTURES}/missing.yml`));
  assert.ok(missing instanceof RemoteError);
  assert.match(missing.message, /HTTP 404/);
  assert.equal(errorProvider(missing)({}).status, 404, 'a fetch that fails is a 404 with the reason');

  const down = thrownBy(() => fetchBundled('https://127.0.0.1:9/c.yml'));
  assert.ok(down instanceof RemoteError, 'a host that does not answer');
}

console.log('remote-test: all assertions passed');
