// The walk is the security surface. Every language port must produce these
// exact outcomes on the two fixtures. Run: npm run test:walk
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { walkCollection, CapError } = require(path.join(here, '..', 'dist', 'collection', 'walk.js'));
const fixture = (name) => path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', name);

// --- walk-safety: symlink to /etc/passwd, dotfiles, editor strays, non-yml, nested dirs
{
  const { files, skipped } = walkCollection(fixture('walk-safety'));
  const served = files.map((f) => f.path);

  assert.ok(served.includes('opencollection.yml'), 'manifest is served');
  assert.ok(!served.some((p) => p.endsWith('secret.yml')), 'symlink target is never served');
  assert.ok(skipped.some((s) => s.path === 'secret.yml' && /symlink/.test(s.rule)), 'symlink is skipped as a symlink, not as some other kind of file');
  assert.ok(!served.some((p) => p.startsWith('.') || p.includes('/.')), 'no dotfiles');
  assert.ok(!served.some((p) => /(~|\.swp|\.bak|\.orig)$/.test(p)), 'no editor strays');
  assert.ok(served.every((p) => /\.ya?ml$/.test(p)), 'only yml served');
  for (const f of files) {
    assert.ok(!f.text.includes('root:x:0:0'), '/etc/passwd content never served');
  }
  assert.ok(skipped.some((s) => s.path === 'control/not-utf8.yml' && /UTF-8/.test(s.rule)), 'invalid UTF-8 file is skipped, not served');
  assert.ok(skipped.some((s) => s.path === 'node_modules' && /stray/.test(s.rule)), 'node_modules is skipped whole, never entered');
  assert.ok(skipped.some((s) => s.path === 'notes.md' && /not \.yml/.test(s.rule)), 'a non-yml file is skipped by extension');
  assert.deepEqual(served, ['control/ping.yml', 'environments/Local.yml', 'opencollection.yml'], 'exactly these files, in this order');
  console.log(`walk-safety: ${served.length} served, ${skipped.length} skipped`);
  for (const s of skipped) {
    console.log(`  skipped ${s.path} (${s.rule})`);
  }
}

// --- walk-oversize: a single file above the 1 MB cap -> CapError, nothing served
{
  assert.throws(() => walkCollection(fixture('walk-oversize')), (err) => {
    assert.ok(err instanceof CapError, 'throws CapError');
    assert.match(err.message, /per-file size cap/);
    return true;
  });
  console.log('walk-oversize: CapError raised before reading the file');
}

// --- the other three caps, with the limits lowered instead of a 5 MB, 5000-file, 32-deep fixture
{
  const safety = fixture('walk-safety');
  const generous = { fileBytes: 1e9, totalBytes: 1e9, fileCount: 1e9, depth: 1e9 };
  assert.equal(walkCollection(safety, generous).files.length, 3, 'nothing is refused when the caps are wide');

  assert.throws(() => walkCollection(safety, { ...generous, totalBytes: 100 }),
    (err) => err instanceof CapError && /total size cap/.test(err.message), 'the total size cap');

  assert.throws(() => walkCollection(safety, { ...generous, fileCount: 2 }),
    (err) => err instanceof CapError && /file count cap/.test(err.message), 'the file count cap');

  assert.throws(() => walkCollection(safety, { ...generous, depth: 0 }),
    (err) => err instanceof CapError && /max directory depth/.test(err.message), 'the directory depth cap');

  assert.equal(walkCollection(safety).files.length, 3, 'and the real caps are the default');
}

// --- a .bru collection: bruno.json is the manifest, .bru files are the collection, nothing else
{
  const { files, skipped } = walkCollection(fixture('api-collection-bru'), undefined, 'bru');
  const served = files.map((f) => f.path);

  assert.ok(served.includes('bruno.json'), 'the manifest is served');
  assert.ok(served.includes('collection.bru'), 'and the collection file');
  assert.ok(served.every((p) => p.endsWith('.bru') || p === 'bruno.json'), 'only .bru files and the manifest');
  assert.equal(served.length, 13, 'every file of the fixture, before filtering');
  assert.equal(skipped.length, 0);

  const { files: ymlWalk } = walkCollection(fixture('api-collection-bru'));
  assert.equal(ymlWalk.length, 0, 'walked as yml, a .bru collection has nothing to serve');
}

console.log('walk-test: all assertions passed');
