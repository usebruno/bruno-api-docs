// One flat map of path -> raw text becomes one OpenCollection document. Pure, so it can be
// tested without a browser, and so it can move into the renderer bundle later without moving
// anything else with it.

import { load as yamlLoad } from 'js-yaml';
import { parseBruRequest, parseBruCollection, parseBruEnvironment, brunoToOpenCollection } from './bru.js';

const MANIFEST_FILE = /^opencollection\.ya?ml$/;
const FOLDER_FILE = /^folder\.ya?ml$/;

export function toOpenCollection(text) {
  const json = parseJsonOrNull(text);
  if (json === null) {
    return yamlLoad(text);
  }
  if (json['opencollection-fragments'] && json.files) {
    return 'bruno.json' in json.files ? assembleBru(json.files) : assembleFragments(json.files);
  }

  return json;
}

/**
 * A .bru collection, the way the CLI reads one from disk: bruno.json and collection.bru at the
 * root, folder.bru in each directory, environments named by file. The vendored converter then
 * produces the same document the app's Generate Docs does.
 */
export function assembleBru(files) {
  const brunoConfig = JSON.parse(files['bruno.json']);
  const root = files['collection.bru'] ? parseBruCollection(files['collection.bru']) : {};
  const environments = [];
  const dirs = new Map([['', { root: null, requests: [], children: [] }]]);
  const parentOf = (dir) => (dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '');
  const ensureDir = (dir) => {
    if (!dirs.has(dir)) {
      dirs.set(dir, { root: null, requests: [], children: [] });
      ensureDir(parentOf(dir)).children.push(dir);
    }

    return dirs.get(dir);
  };

  for (const filePath of Object.keys(files)) {
    if (filePath === 'bruno.json' || filePath === 'collection.bru') continue;
    if (filePath.startsWith('environments/')) {
      const name = filePath.slice('environments/'.length, -'.bru'.length);
      environments.push({ name, ...parseBruEnvironment(files[filePath]) });
      continue;
    }

    const slash = filePath.lastIndexOf('/');
    const node = ensureDir(slash === -1 ? '' : filePath.slice(0, slash));
    if (filePath.slice(slash + 1) === 'folder.bru') {
      node.root = parseBruCollection(files[filePath]);
    }
    else {
      node.requests.push(parseBruRequest(files[filePath]));
    }
  }

  const bySeqThenName = (a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER) || (a.name || '').localeCompare(b.name || '');
  const materialize = (dir) => {
    const node = dirs.get(dir);
    const folders = node.children.map((childDir) => {
      const child = dirs.get(childDir);
      const dirName = childDir.slice(childDir.lastIndexOf('/') + 1);

      return { type: 'folder', name: child.root?.meta?.name || dirName, seq: child.root?.meta?.seq, root: child.root, items: materialize(childDir) };
    });

    return [...folders.sort(bySeqThenName), ...node.requests.sort(bySeqThenName)];
  };

  return brunoToOpenCollection({ name: brunoConfig.name, brunoConfig, root, items: materialize(''), environments });
}

function parseJsonOrNull(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  }
  catch {
    return null;
  }
}

export function assembleFragments(files) {
  const manifestPath = Object.keys(files).find((p) => MANIFEST_FILE.test(p));
  if (!manifestPath) {
    throw new Error('fragments payload has no opencollection.yml manifest');
  }

  const parse = (filePath) => {
    try {
      return yamlLoad(files[filePath]);
    }
    catch {
      throw new Error('invalid YAML in ' + filePath);
    }
  };
  const parentOf = (dir) => (dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '');

  const doc = parse(manifestPath) || {};
  const environments = [];
  const dirs = new Map([['', newDir()]]);

  // set before recursing, so ensuring a parent cannot recreate the child it was reached from
  const ensureDir = (dir) => {
    if (!dirs.has(dir)) {
      dirs.set(dir, newDir());
      ensureDir(parentOf(dir)).children.push(dir);
    }

    return dirs.get(dir);
  };

  for (const filePath of Object.keys(files)) {
    if (filePath === manifestPath) continue;
    if (filePath.startsWith('environments/')) {
      environments.push(parse(filePath));
      continue;
    }

    const slash = filePath.lastIndexOf('/');
    const node = ensureDir(slash === -1 ? '' : filePath.slice(0, slash));
    if (FOLDER_FILE.test(filePath.slice(slash + 1))) {
      node.meta = parse(filePath);
    }
    else {
      node.requests.push(parse(filePath));
    }
  }

  doc.items = materialize('', dirs);
  if (environments.length) {
    doc.config = doc.config || {};
    doc.config.environments = environments;
  }
  doc.bundled = true;

  return doc;
}

const newDir = () => ({ meta: null, requests: [], children: [] });

const seqOf = (item) => {
  const seq = item && item.info && item.info.seq;
  return typeof seq === 'number' ? seq : Number.MAX_SAFE_INTEGER;
};
const nameOf = (item) => (item && item.info && item.info.name) || '';
const bySeqThenName = (a, b) => seqOf(a) - seqOf(b) || nameOf(a).localeCompare(nameOf(b));

function materialize(dir, dirs) {
  const node = dirs.get(dir);
  const folders = node.children.map((childDir) => {
    const child = dirs.get(childDir);
    const name = childDir.slice(childDir.lastIndexOf('/') + 1);
    const folder = child.meta || { info: { name } };
    // a directory is a folder whatever its folder.yml says or leaves out; the renderer decides
    // by this field alone, and without it a folder renders as an empty request
    folder.info = { ...folder.info, type: 'folder' };
    folder.items = materialize(childDir, dirs);

    return folder;
  });

  return [...folders.sort(bySeqThenName), ...node.requests.sort(bySeqThenName)];
}
