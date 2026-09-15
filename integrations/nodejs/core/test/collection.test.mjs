// The collection layer end to end: where the document comes from, how it is built, what the
// mount answers when it cannot be. Run: npm run test:collection
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(here, '..', 'dist');
const { providerFor } = require(path.join(dist, 'collection', 'index.js'));
const { fileProvider, dirProvider, errorProvider, ManifestError } = require(path.join(dist, 'collection', 'providers.js'));
const { resolveCollectionSource, resolveCollectionPath } = require(path.join(dist, 'collection', 'source.js'));
const { CapError, CAPS } = require(path.join(dist, 'collection', 'walk.js'));
const { ConfigError } = require(path.join(dist, 'options.js'));

const fixture = (name) => path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', name);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-docs-'));
const write = (rel, text) => {
  const full = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  return full;
};
const thrownBy = (fn) => {
  try {
    quiet(fn);
    return null;
  } catch (err) {
    return err;
  }
};
const quiet = (fn) => {
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    return fn();
  } finally {
    Object.assign(console, { log, warn });
  }
};

// --- directory mode: one envelope, built once, served by ETag
{
  const built = dirProvider(fixture('walk-safety'), {});
  const first = built.serve({});
  assert.equal(first.status, 200);
  assert.equal(first.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(first.headers['Cache-Control'], 'private, no-store');
  assert.equal(first.headers['X-Content-Type-Options'], 'nosniff');

  const envelope = JSON.parse(first.body);
  assert.equal(envelope['opencollection-fragments'], '1');
  assert.deepEqual(Object.keys(envelope.files).sort(), ['control/ping.yml', 'opencollection.yml'], 'no environments by default');

  const second = built.serve({ ifNoneMatch: first.headers.ETag });
  assert.equal(second.status, 304, 'a matching ETag is a 304');
  assert.equal(second.body, null, 'and carries no body');
  assert.equal(built.serve({ ifNoneMatch: '"stale"' }).status, 200, 'a stale ETag is served again');
  assert.equal(built.serve({}).headers.ETag, first.headers.ETag, 'the ETag is stable across requests');
}

// --- file mode: same contract, a different content type
{
  const single = write('bundled/opencollection.yml', 'opencollection: 1.0.0\nbundled: true\ninfo:\n  name: Bundled\n');
  const built = fileProvider(single);
  const first = built.serve({});
  assert.equal(first.status, 200);
  assert.equal(first.headers['Content-Type'], 'text/yaml; charset=utf-8');
  assert.ok(first.headers.ETag, 'file mode validates with an ETag, not Last-Modified');
  assert.equal(first.headers['Last-Modified'], undefined, 'nothing re-reads the file, so there is no modification time to report');
  assert.equal(built.serve({ ifNoneMatch: first.headers.ETag }).status, 304);
}

// --- the failures, each mapped to what the mount answers
{
  const oversize = thrownBy(() => dirProvider(fixture('walk-oversize'), {}));
  assert.ok(oversize instanceof CapError, 'a collection over the caps fails to build');
  assert.equal(errorProvider(oversize)({}).status, 413);

  fs.mkdirSync(path.join(tmp, 'no-manifest'), { recursive: true });
  write('no-manifest/ping.yml', 'info:\n  name: ping\n');
  const missing = thrownBy(() => dirProvider(path.join(tmp, 'no-manifest'), {}));
  assert.ok(missing instanceof ManifestError, 'a directory without a manifest fails to build');
  assert.equal(errorProvider(missing)({}).status, 404);

  const absent = thrownBy(() => fileProvider(path.join(tmp, 'nope.yml')));
  assert.equal(errorProvider(absent)({}).status, 404, 'a missing file is a 404');

  const huge = write('huge/opencollection.yml', '');
  fs.writeFileSync(huge, Buffer.alloc(CAPS.totalBytes + 1, 0x20));
  const overCap = thrownBy(() => fileProvider(huge));
  assert.ok(overCap instanceof CapError, 'a bundled file over the caps fails to build, same as a directory');
  assert.equal(errorProvider(overCap)({}).status, 413);

  assert.equal(errorProvider(new ConfigError('bad option'))({}).status, 500);
  assert.equal(errorProvider(new Error('disk on fire'))({}).status, 500);
  assert.match(String(errorProvider(new Error('disk on fire'))({}).body), /could not be read/);
}

// --- whatever sends resolveCollectionSource into its catch still reaches the mount with a status
{
  const gone = path.join(tmp, 'not-here.yml');
  assert.equal(resolveCollectionSource(gone).mode, 'file', 'an unstattable path falls through to file mode');
  assert.throws(() => quiet(() => providerFor({ collection: gone })), { code: 'ENOENT' });
  assert.equal(errorProvider(thrownBy(() => providerFor({ collection: gone })))({}).status, 404);

  if (process.getuid?.() !== 0) {
    const locked = write('locked/opencollection.yml', 'opencollection: 1.0.0\nbundled: false\n');
    fs.chmodSync(locked, 0o000);
    assert.equal(resolveCollectionSource(locked).mode, 'file', 'an unreadable manifest falls through to file mode');
    assert.equal(errorProvider(thrownBy(() => providerFor({ collection: locked })))({}).status, 500);
    fs.chmodSync(locked, 0o644);
  }
}

// --- filters need a directory, and that is a startup failure
{
  const single = write('solo/opencollection.yml', 'opencollection: 1.0.0\nbundled: true\n');
  assert.throws(() => quiet(() => providerFor({ collection: single, tags: { exclude: ['internal'] } })), ConfigError);
  assert.throws(() => quiet(() => providerFor({ collection: single, environments: { all: true } })), ConfigError);
  assert.equal(quiet(() => providerFor({ collection: single }))({}).status, 200, 'without filters it serves');
}

// --- pointing at the manifest of an unbundled collection means the directory around it
{
  const manifest = write('unbundled/opencollection.yml', 'opencollection: 1.0.0\nbundled: false\n');
  assert.deepEqual(resolveCollectionSource(manifest), { mode: 'dir', path: path.join(tmp, 'unbundled') });

  const bundled = write('is-bundled/opencollection.yml', 'opencollection: 1.0.0\nbundled: true\n');
  assert.equal(resolveCollectionSource(bundled).mode, 'file');

  const broken = write('broken/opencollection.yml', 'opencollection: [unclosed\n');
  assert.equal(resolveCollectionSource(broken).mode, 'file', 'an unreadable manifest is not treated as a directory');

  assert.equal(resolveCollectionPath('/already/absolute'), '/already/absolute', 'path.resolve leaves an absolute path alone');

  // guarded here, not in validateOptions: an empty path resolves to the app's own directory,
  // so any caller that skipped the validator would walk it and serve whatever yml lives there
  for (const empty of ['', undefined, null]) {
    assert.throws(() => resolveCollectionPath(empty), ConfigError, `${JSON.stringify(empty)} is refused`);
    assert.throws(() => quiet(() => providerFor({ collection: empty })), ConfigError, 'and refused through providerFor');
  }
}

// --- a relative path resolves against the app's entry file, in CJS and in ESM
{
  const appDir = path.join(tmp, 'app');
  const body = 'console.log(require(process.env.CORE).resolveCollectionPath("./api-collection"));';
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, 'entry.cjs'), body);
  fs.writeFileSync(path.join(appDir, 'entry.mjs'), `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\n${body}`);

  // realpath both sides: require.main.path resolves symlinks (/var -> /private/var on macOS)
  // and process.argv[1] does not, so the two entry points spell the same directory differently.
  const expected = fs.realpathSync(appDir);
  for (const entry of ['entry.cjs', 'entry.mjs']) {
    const out = execFileSync(process.execPath, [path.join(appDir, entry)], {
      cwd: os.tmpdir(),
      env: { ...process.env, CORE: path.join(dist, 'collection', 'source.js') }
    }).toString().trim();
    assert.equal(fs.realpathSync(path.dirname(out)), expected, `${entry}: resolves against the entry file, not the cwd`);
    assert.equal(path.basename(out), 'api-collection');
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('collection-test: all assertions passed');
