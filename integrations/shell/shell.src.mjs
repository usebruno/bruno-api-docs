// The browser half, identical for every language core: fetch collection.yml, assemble, boot.

import { toOpenCollection } from './assemble.mjs';

(async function main() {
  const mount = document.getElementById('bruno-docs');
  const errorBox = document.getElementById('bruno-docs-error');
  const base = mount.dataset.base;
  const cdn = mount.dataset.cdn;
  const config = JSON.parse(mount.dataset.config || '{}');
  const version = (window.Bruno && window.Bruno.version) || 'version unknown';

  // via CSSOM: an inline <style> is blocked under a strict style-src
  document.body.style.margin = '0';
  mount.style.width = '100vw';
  mount.style.height = '100vh';

  function fail(message) {
    mount.style.display = 'none';
    errorBox.hidden = false;
    Object.assign(errorBox.style, {
      padding: '2rem',
      margin: '0',
      font: '14px/1.7 ui-monospace, SFMono-Regular, monospace',
      whiteSpace: 'pre-wrap',
      color: '#b3261e'
    });
    errorBox.textContent = 'Bruno API Docs failed to start.\n\n' + message + '\n\napi-docs: ' + version;
  }

  const boot = resolveBoot();
  if (!boot) {
    return fail(
      'The renderer bundle did not load or did not execute.\n'
      + 'Check that ' + cdn + '/api-docs.js is reachable. It is loaded from a CDN, so this\n'
      + 'also fails on an air-gapped network or under a Content-Security-Policy that does not\n'
      + 'allow that origin in script-src and style-src.'
    );
  }

  const collectionUrl = new URL(base + 'collection.yml', location.origin).href;
  let res;
  let text;
  try {
    res = await fetch(collectionUrl);
    text = await res.text();
  }
  catch (err) {
    return fail('GET ' + collectionUrl + '\n  -> ' + err.message);
  }
  if (!res.ok) {
    const detail = text ? '\n\n' + text : '';
    return fail('GET ' + collectionUrl + '\n  -> HTTP ' + res.status + ' ' + res.statusText + detail);
  }

  let doc;
  try {
    doc = toOpenCollection(text);
  }
  catch (err) {
    return fail('Could not read the collection:\n  ' + err.message);
  }

  try {
    // both names on purpose: the renderer reads `opencollection` today and is moving to
    // `content`. Passing both means neither side has to land first. Do not clean this up.
    boot(mount, { ...config, opencollection: doc, content: doc });
  }
  catch (err) {
    return fail('The renderer threw while mounting:\n  ' + err.message);
  }
  console.info('[bruno-docs] api-docs ' + version + ', collection from ' + collectionUrl);
})();

function resolveBoot() {
  if (typeof window.Bruno?.apiDocs === 'function') {
    return (target, config) => window.Bruno.apiDocs(target, config);
  }
  // until the CDN has deployed a bundle that carries the namespace
  if (typeof window.OpenCollection === 'function') {
    return (target, config) => new window.OpenCollection({ target, ...config });
  }
  return null;
}
