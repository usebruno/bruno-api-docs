// Which files leave the server. The environments table mirrors the CLI's resolveEnvironments,
// the tags predicate is bruno-common's. Run: npm run test:filter
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { applyFilters, isManifest, environmentName, requestTags, isRequestTagsIncluded } = require(path.join(here, '..', 'dist', 'collection', 'filter.js'));
const { ConfigError, validateOptions } = require(path.join(here, '..', 'dist', 'options.js'));

const file = (p, text) => ({ path: p, text });
const request = (name, tags) => `info:\n  name: ${name}\n${tags ? `  tags:\n${tags.map((t) => `    - ${t}\n`).join('')}` : ''}`;

const collection = [
  file('opencollection.yml', 'opencollection: 1.0.0\n'),
  file('environments/Local.yml', 'name: Local\nvariables: []\n'),
  file('environments/Prod.yml', 'name: Prod\nvariables: []\n'),
  file('control/folder.yml', request('control')),
  file('control/ping.yml', request('ping')),
  file('control/health.yml', request('health', ['internal'])),
  file('control/environments/Sneaky.yml', 'name: Sneaky\n'),
  file('admin/folder.yml', request('admin')),
  file('admin/purge.yml', request('purge', ['internal'])),
  file('admin2/folder.yml', request('admin2')),
  file('admin2/hello.yml', request('hello2')),
  file('public/folder.yml', request('public')),
  file('public/hello.yml', request('hello')),
  file('control/broken.yml', 'info:\n  tags: [unclosed\n'),
  file('control/numeric-tags.yml', 'info:\n  name: numeric\n  tags:\n    - 1\n')
];

const served = (filters) => applyFilters(collection, filters).files.map((f) => f.path).sort();
const envs = (filters) => served(filters).filter((p) => p.startsWith('environments/'));
const ruleFor = (filters, p) => applyFilters(collection, filters).skipped.find((s) => s.path === p)?.rule;

// --- environments: the table
assert.deepEqual(envs({}), [], 'absent -> none');
assert.deepEqual(envs({ environments: { include: ['Local'] } }), ['environments/Local.yml'], 'include -> those');
assert.deepEqual(envs({ environments: { include: '*' } }), ['environments/Local.yml', 'environments/Prod.yml'], 'the wildcard publishes every environment');
assert.deepEqual(envs({ environments: { include: '*', exclude: ['Prod'] } }), ['environments/Local.yml'], 'the wildcard minus an exclude');
assert.deepEqual(envs({ environments: { include: ['Local', 'Prod'], exclude: ['Prod'] } }), ['environments/Local.yml'], 'include minus exclude');

assert.throws(() => served({ environments: { include: ['Nope'] } }), ConfigError, 'unknown include is a startup error');
assert.deepEqual(applyFilters(collection, { environments: { include: '*', exclude: ['Nope'] } }).unknownEnvironments, ['Nope'], 'unknown exclude warns, does not throw');

assert.equal(ruleFor({ environments: { include: '*' } }, 'control/environments/Sneaky.yml'), 'nested environments directory', 'a nested environments dir is never published');
assert.equal(ruleFor({}, 'environments/Local.yml'), 'environments not published by default');

// --- tags: whole request files, folders pruned behind them
assert.deepEqual(served({}).filter((p) => p.startsWith('control/') || p.startsWith('admin/')), [
  'control/broken.yml', 'control/folder.yml', 'control/health.yml', 'control/numeric-tags.yml', 'control/ping.yml',
  'admin/folder.yml', 'admin/purge.yml'
].sort(), 'no tags option -> every request ships, nothing is parsed');

{
  const kept = served({ tags: { exclude: ['internal'] } });
  assert.ok(!kept.includes('control/health.yml') && !kept.includes('admin/purge.yml'), 'exclude drops the tagged requests');
  assert.ok(kept.includes('control/ping.yml'), 'the untagged sibling stays');
  assert.ok(kept.includes('control/folder.yml'), 'its folder stays, a request survived below it');
  assert.ok(!kept.includes('admin/folder.yml'), 'a folder whose only request went is pruned');
  assert.ok(kept.includes('opencollection.yml'), 'the manifest always ships');
}

{
  const kept = served({ tags: { include: ['internal'] } });
  assert.deepEqual(kept.filter((p) => !p.endsWith('folder.yml') && p !== 'opencollection.yml'), ['admin/purge.yml', 'control/health.yml'], 'include keeps exactly the tagged requests');
  assert.ok(!kept.includes('public/folder.yml'), 'the untagged folder is pruned');
}

assert.deepEqual(served({ tags: { include: ['internal'], exclude: ['internal'] } }).filter((p) => !p.endsWith('folder.yml') && p !== 'opencollection.yml'), [], 'exclude wins over include');

// --- the wildcard: on tags it says out loud what no option already means
assert.deepEqual(served({ tags: { include: '*' } }), served({}), 'include * serves exactly what no tags option serves');
assert.deepEqual(served({ tags: { include: '*', exclude: ['internal'] } }), served({ tags: { exclude: ['internal'] } }),
  'and reads as everything-except without changing what is dropped');

// --- fail closed: a request whose tags cannot be read is not published while a filter is set
for (const unreadable of ['control/broken.yml', 'control/numeric-tags.yml']) {
  assert.ok(served({}).includes(unreadable), `${unreadable} ships when no tag filter is set`);
  assert.ok(!served({ tags: { exclude: ['internal'] } }).includes(unreadable), `${unreadable} is dropped rather than guessed at`);
}
assert.deepEqual(requestTags('info:\n  name: x\n'), [], 'no tags key means no tags, not unreadable');
assert.equal(requestTags('['), null, 'malformed yaml is unreadable');

assert.equal(environmentName('name: Local\nvariables: []\n'), 'Local', 'the name field is what an environment is matched on');
assert.equal(environmentName('variables: []\n'), null, 'no name field, no match');
assert.equal(environmentName('name: 7\n'), null, 'a non-string name is not a name');
assert.equal(environmentName('['), null, 'malformed yaml is not a name');

// --- both filters at once, which is what a real mount configures
{
  const kept = served({ environments: { include: ['Local'] }, tags: { exclude: ['internal'] } });
  assert.deepEqual(kept.filter((p) => p.startsWith('environments/')), ['environments/Local.yml'], 'the environment filter still applies');
  assert.ok(!kept.includes('control/health.yml'), 'and the tag filter still applies');
}

// --- the manifest is not a request, whichever extension it uses
for (const name of ['opencollection.yml', 'opencollection.yaml']) {
  const only = [{ path: name, text: 'opencollection: 1.0.0\ninfo:\n  name: X\n' }];
  assert.ok(isManifest(name), `${name} is the manifest`);
  assert.deepEqual(applyFilters(only, { tags: { include: ['public'] } }).files.map((f) => f.path), [name], `${name} survives a tag include filter`);
}
assert.equal(isManifest('control/opencollection.yml'), false, 'only at the root');

// --- the predicate itself, as bruno-common defines it
assert.equal(isRequestTagsIncluded([], [], []), true, 'no filter, no tags');
assert.equal(isRequestTagsIncluded([], ['a'], []), false, 'include set, request has none');
assert.equal(isRequestTagsIncluded(['a'], ['a', 'b'], []), true, 'any one include tag is enough');
assert.equal(isRequestTagsIncluded(['a', 'b'], [], ['b']), false, 'any one exclude tag is fatal');

// --- startup validation of the same options
assert.throws(() => validateOptions({ environments: { exclude: ['Prod'] } }), /needs a base/);
validateOptions({ tags: { exclude: ['internal'] } });

// a bare string is the natural typo for a list, and the only string we accept is the wildcard
assert.throws(() => validateOptions({ environments: { include: 'Local' } }), /`environments.include` takes a list of names or '\*'/,
  'a string that is not the wildcard is named, not silently read as no names');
assert.throws(() => validateOptions({ tags: { include: 'internal' } }), /`tags.include` takes a list/);
validateOptions({ environments: { include: '*' }, tags: { include: '*' } });
assert.throws(() => validateOptions({ collectionPath: './c', theme: 'dark', favicon: 'x' }), /unknown option theme, favicon/, 'every unknown key, named');
validateOptions({ environments: { include: '*', exclude: ['Prod'] } });
validateOptions({});

console.log('filter-test: all assertions passed');
