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

console.log('walk-test: all assertions passed');
