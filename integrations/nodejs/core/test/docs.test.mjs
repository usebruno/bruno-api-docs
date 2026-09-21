// createDocs end to end: the routes every framework hosts, and what the mount answers
// when the setup is broken. Run: npm run test:docs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createDocs } = require(path.join(here, '..', 'dist', 'index.js'));

const collectionPath = path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', 'walk-safety');
const quiet = (fn) => {
  const { log, warn, error } = console;
  console.log = console.warn = console.error = () => {};
  try {
    return fn();
  } finally {
    Object.assign(console, { log, warn, error });
  }
};

// a request as Express hands it over: url is mount-relative, originalUrl is the whole path
const call = (handler, method, mount, sub, headers = {}) => {
  const res = { status: 0, headers: {}, body: undefined, ended: false };
  handler(
    { method, url: sub, originalUrl: mount + sub, headers },
    {
      writeHead(status, h) {
        res.status = status;
        res.headers = h ?? {};
      },
      end(body) {
        res.body = body;
        res.ended = true;
      }
    }
  );

  return res;
};

const docs = quiet(() => createDocs({ collectionPath, pageTitle: 'Fixture API' }));
const handler = docs.handler();

// --- the routes, as the contract states them
{
  const redirect = call(handler, 'GET', '/docs', '');
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.Location, 'docs/', 'relative, so a proxy that rewrites the prefix survives it');

  const page = call(handler, 'GET', '/docs', '/');
  assert.equal(page.status, 200);
  assert.equal(page.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.ok(page.body.includes('data-base="/docs/"'));
  assert.ok(page.body.includes('<title>Fixture API</title>'));

  const deep = call(handler, 'GET', '/docs', '/requests/ping/');
  assert.equal(deep.status, 200, 'any depth serves the page, for renderer deep links');
  assert.ok(deep.body.includes('data-base="/docs/"'), 'stamped with the mount, not the deep path');

  const js = call(handler, 'GET', '/docs', '/shell.js');
  assert.equal(js.status, 200);
  assert.equal(js.headers['Content-Type'], 'application/javascript; charset=utf-8');
  assert.equal(call(handler, 'GET', '/docs', '/shell.js', { 'if-none-match': js.headers.ETag }).status, 304);

  const yml = call(handler, 'GET', '/docs', '/collection.yml');
  assert.equal(yml.status, 200);
  assert.equal(yml.headers['Cache-Control'], 'private, no-store');
  assert.equal(call(handler, 'GET', '/docs', '/collection.yml', { 'if-none-match': yml.headers.ETag }).status, 304);

  const head = call(handler, 'HEAD', '/docs', '/');
  assert.equal(head.status, 200);
  assert.equal(head.body, undefined, 'HEAD answers like GET with no body');

  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = call(handler, method, '/docs', '/');
    assert.equal(res.status, 405, `${method} is refused`);
    assert.equal(res.headers.Allow, 'GET, HEAD');
  }
}

// --- the same handler at a different mount, with no query-string confusion
{
  assert.ok(call(handler, 'GET', '/api/v2/docs', '/').body.includes('data-base="/api/v2/docs/"'),
    'the base comes from the mount the request arrived on');
  assert.equal(call(handler, 'GET', '/docs', '/shell.js?v=2').status, 200, 'a query string is not part of the route');
}

// --- a framework that does not set originalUrl still works when mounted at the root
{
  const res = { status: 0, headers: {}, body: undefined };
  handler({ method: 'GET', url: '/shell.js', headers: {} }, {
    writeHead(s, h) {
      res.status = s;
      res.headers = h ?? {};
    },
    end(b) {
      res.body = b;
    }
  });
  assert.equal(res.status, 200);
}

// --- a framework that hands over an empty url is treated as the mount root, not a bad redirect
{
  const res = { status: 0, headers: {} };
  handler({ method: 'GET', url: '', originalUrl: '', headers: {} }, {
    writeHead(s, h) {
      res.status = s;
      res.headers = h ?? {};
    },
    end() {}
  });
  assert.equal(res.status, 200, 'an empty url serves the page rather than redirecting to nowhere');
  assert.equal(res.headers.Location, undefined);
}

// --- a broken setup starts the app and explains itself at the mount
{
  const missing = path.join(os.tmpdir(), 'bruno-docs-absent-' + Date.now());
  let broken;
  assert.doesNotThrow(() => {
    broken = quiet(() => createDocs({ collectionPath: missing }));
  }, 'createDocs never throws: a docs page cannot take down the API it documents');

  const brokenHandler = broken.handler();
  for (const route of ['/', '/shell.js', '/collection.yml', '/deep/path/']) {
    const res = call(brokenHandler, 'GET', '/docs', route);
    assert.equal(res.status, 404, `${route} answers with the reason`);
    assert.match(String(res.body), /Collection not found/);
  }

  const overCap = quiet(() => createDocs({
    collectionPath: path.join(here, '..', '..', '..', 'contract-tests', 'fixtures', 'walk-oversize')
  }));
  assert.equal(overCap.collection().status, 413, 'a collection over the caps is a 413 at the mount');

  const badOptions = quiet(() => createDocs({ collectionPath, environments: { exclude: ['Prod'] } }));
  assert.equal(badOptions.collection().status, 500, 'a config error reaches the mount too, not the boot');

  const typo = quiet(() => createDocs({ collectionPath, theme: 'dark' }));
  assert.equal(typo.collection().status, 500, 'an option we do not know is an error, not silently forwarded');
  assert.match(String(typo.collection().body), /unknown option theme/);
}

fs.rmSync(path.join(os.tmpdir(), 'x-not-there'), { force: true });
console.log('docs-test: all assertions passed');
