// Flat files in, one ordered document out. Run: npm run test:assemble
import assert from 'node:assert/strict';
import { toOpenCollection, assembleFragments } from '../assemble.mjs';

const request = (name, seq) => `info:\n  name: ${name}\n  type: http\n${seq === undefined ? '' : `  seq: ${seq}\n`}`;
const envelope = (files) => JSON.stringify({ 'opencollection-fragments': '1', files });
const names = (items) => items.map((i) => i.info.name);

// --- a flat collection
{
  const doc = assembleFragments({
    'opencollection.yml': 'opencollection: 1.0.0\ninfo:\n  name: Acme\n',
    'ping.yml': request('ping'),
    'health.yml': request('health')
  });

  assert.equal(doc.info.name, 'Acme', 'the manifest is the document');
  assert.equal(doc.bundled, true, 'the assembled document is bundled');
  assert.deepEqual(names(doc.items), ['health', 'ping'], 'no seq means alphabetical');
}

// --- folders before requests, then seq, then name
{
  const doc = assembleFragments({
    'opencollection.yml': 'opencollection: 1.0.0\n',
    'zeta.yml': request('zeta', 1),
    'alpha.yml': request('alpha', 2),
    'beta.yml': request('beta'),
    'admin/folder.yml': 'info:\n  name: Admin\n  seq: 9\n',
    'admin/purge.yml': request('purge'),
    'public/folder.yml': 'info:\n  name: Public\n  seq: 1\n',
    'public/hello.yml': request('hello')
  });

  assert.deepEqual(names(doc.items), ['Public', 'Admin', 'zeta', 'alpha', 'beta'],
    'folders first by seq, then requests by seq, then the unsequenced by name');
  assert.deepEqual(names(doc.items[0].items), ['hello'], 'a folder carries its own requests');
}

// --- a folder with no folder.yml still becomes a folder, named after the directory
{
  const doc = assembleFragments({
    'opencollection.yml': 'opencollection: 1.0.0\n',
    'orphan/ping.yml': request('ping')
  });

  assert.deepEqual(names(doc.items), ['orphan']);
  assert.equal(doc.items[0].info.type, 'folder');
  assert.deepEqual(names(doc.items[0].items), ['ping']);
}

// --- nesting several deep, with no folder.yml at any level
{
  const doc = assembleFragments({
    'opencollection.yml': 'opencollection: 1.0.0\n',
    'a/b/c/deep.yml': request('deep')
  });

  assert.deepEqual(names(doc.items), ['a']);
  assert.deepEqual(names(doc.items[0].items), ['b']);
  assert.deepEqual(names(doc.items[0].items[0].items), ['c']);
  assert.deepEqual(names(doc.items[0].items[0].items[0].items), ['deep']);
}

// --- environments land on config, not in the tree
{
  const doc = assembleFragments({
    'opencollection.yml': 'opencollection: 1.0.0\n',
    'environments/Local.yml': 'name: Local\nvariables: []\n',
    'ping.yml': request('ping')
  });

  assert.deepEqual(doc.config.environments.map((e) => e.name), ['Local']);
  assert.deepEqual(names(doc.items), ['ping'], 'an environment is not an item');
}

// --- the failures
{
  assert.throws(() => assembleFragments({ 'ping.yml': request('ping') }), /no opencollection.yml manifest/);
  assert.throws(() => assembleFragments({ 'opencollection.yaml': 'opencollection: 1.0.0\n', 'x.yml': '[' }), /invalid YAML in x.yml/);
  assert.doesNotThrow(() => assembleFragments({ 'opencollection.yaml': 'opencollection: 1.0.0\n' }), 'a .yaml manifest counts');
}

// --- toOpenCollection: three payload shapes
{
  assert.equal(toOpenCollection('info:\n  name: Yaml\n').info.name, 'Yaml', 'raw yaml passes through');
  assert.equal(toOpenCollection('{"info":{"name":"Json"}}').info.name, 'Json', 'plain json passes through');
  assert.equal(toOpenCollection(envelope({ 'opencollection.yml': 'info:\n  name: Env\n' })).info.name, 'Env', 'an envelope is assembled');
  assert.equal(toOpenCollection(envelope({ 'opencollection.yml': 'info:\n  name: Env\n' })).bundled, true);
}

console.log('assemble-test: all assertions passed');
