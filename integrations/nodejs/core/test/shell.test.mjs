// The page the mount serves, and what it is allowed to tell the browser.
// Run: npm run test:shell
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(here, '..', 'dist');
const { loadShell, embed, rendererConfig, stripGitCredentials, CDN } = require(path.join(dist, 'routes', 'shell.js'));

// --- stamping: every placeholder is filled, at any mount
{
  const shell = loadShell({ collection: './c', pageTitle: 'Acme API' });
  const html = shell.html('/docs/').body;

  assert.ok(!html.includes('{{'), 'no placeholder survives stamping');
  assert.ok(html.includes('<title>Acme API</title>'), 'pageTitle becomes the page title');
  assert.ok(html.includes('data-base="/docs/"'), 'the mount base is stamped in');
  assert.ok(html.includes(`data-cdn="${CDN}"`));
  assert.ok(html.includes('src="/docs/shell.js"'), 'shell.js is loaded from the mount, same origin');
  assert.ok(html.includes(`src="${CDN}/api-docs.js"`), 'the renderer comes from the CDN');

  assert.equal(loadShell({ collection: './c' }).html('/x/').body.match(/<title>(.*)<\/title>/)[1], 'API Documentation');
  assert.ok(loadShell({ collection: './c' }).html('/a/b/c/').body.includes('data-base="/a/b/c/"'), 'any depth');
}

// --- the CSP promise: nothing inline
{
  const html = loadShell({ collection: './c' }).html('/docs/').body;
  assert.ok(!/<style/i.test(html), 'no inline style');
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), 'every script tag has a src, none has a body');
}

// --- escaping, because pageTitle and the config are adopter input
{
  const nasty = loadShell({
    collection: './c',
    pageTitle: '</title><script>alert(1)</script>',
    logo: 'https://x.test/a"onerror="alert(1)'
  }).html('/docs/').body;

  assert.ok(!nasty.includes('<script>alert(1)</script>'), 'a title cannot close the tag and inject');
  assert.ok(nasty.includes('&lt;/title&gt;'), 'it is escaped instead');
  assert.ok(!/data-config="[^"]*"onerror=/.test(nasty), 'a config value cannot break out of the attribute');
}

// --- only renderer options reach the browser, and credentials never do
{
  const config = rendererConfig({
    collection: './secret-path',
    environments: { include: '*' },
    tags: { exclude: ['internal'] },
    pageTitle: 'Docs',
    logo: 'https://x.test/l.svg',
    gitCollectionUrl: 'https://user:tok@github.com/acme/api-collection'
  });

  assert.deepEqual(Object.keys(config).sort(), ['gitCollectionUrl', 'logo'],
    'only what the renderer reads is forwarded');
  assert.equal(config.gitCollectionUrl, 'https://github.com/acme/api-collection', 'credentials stripped');
  assert.deepEqual(rendererConfig({}), {}, 'nothing set means nothing forwarded');

  const html = loadShell({
    collection: './secret-path',
    tags: { exclude: ['internal'] },
    environments: { include: ['Prod'] },
    pageTitle: 'Acme API'
  }).html('/docs/').body;
  for (const leak of ['secret-path', 'internal', 'Prod', 'tags', 'environments']) {
    assert.ok(!html.includes(leak), `the page never mentions ${leak}`);
  }

  const sentToRenderer = html.match(/data-config="([^"]*)"/)[1];
  assert.ok(!sentToRenderer.includes('pageTitle'), 'pageTitle titles the page, it is not sent to the renderer');
  assert.ok(html.includes('<title>Acme API</title>'), 'it is used for the title tag');
}

// --- stripGitCredentials on its own
{
  assert.equal(stripGitCredentials('https://u:p@host/r.git'), 'https://host/r.git');
  assert.equal(stripGitCredentials('https://u@host/r.git'), 'https://host/r.git');
  assert.equal(stripGitCredentials('https://host/r.git'), 'https://host/r.git', 'untouched when there is nothing to strip');
  assert.equal(stripGitCredentials('git@github.com:acme/r.git'), 'git@github.com:acme/r.git', 'scp-style is not a URL, left alone');
  assert.equal(stripGitCredentials('not a url'), 'not a url');
}

// --- shell.js: static, cacheable, revalidates
{
  const shell = loadShell({ collection: './c' });
  const res = shell.js({});
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'application/javascript; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'public, max-age=3600');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(shell.js({ ifNoneMatch: res.headers.ETag }).status, 304);
  assert.equal(shell.js({ ifNoneMatch: '"stale"' }).status, 200);

  assert.equal(loadShell({ collection: './c', pageTitle: 'Other' }).js({}).headers.ETag, res.headers.ETag,
    'shell.js is identical whatever the options, so it caches across mounts');
}

// --- the page itself must never be cached: it carries the per-mount base
{
  assert.equal(loadShell({ collection: './c' }).html('/docs/').headers['Cache-Control'], 'no-cache');
}

// --- embed(): the body block only, for an adopter's own page. No collection involved.
{
  const block = embed({ base: '/docs' });
  assert.ok(!block.includes('<html'), 'no document wrapper');
  assert.ok(!block.includes('<title'), 'the host page owns the title');
  assert.ok(block.includes('id="bruno-docs"') && block.includes('src="/docs/shell.js"'), 'a base without a trailing slash still works');
  assert.ok(block.startsWith('<!-- embed:start -->') && block.endsWith('<!-- embed:end -->'));
  assert.equal(embed({ base: '/docs/' }), block, 'with or without the slash, the same block');
  assert.ok(embed({ base: '/docs', gitCollectionUrl: 'https://u:p@github.com/acme/api' }).includes('github.com/acme/api'), 'renderer options reach the block');
  assert.ok(!embed({ base: '/docs', gitCollectionUrl: 'https://u:p@github.com/acme/api' }).includes('u:p@'), 'with credentials stripped, as on the page');
  assert.throws(() => embed({ base: '' }), /`base`/);
}

// --- the built bundle the core ships
{
  const bundle = fs.readFileSync(path.join(here, '..', 'shell', 'shell.js'), 'utf8');
  assert.ok(bundle.includes('opencollection-fragments'), 'the fragments format is understood in the browser');
  assert.ok(bundle.length > 20000, 'js-yaml is bundled in, not fetched');
  assert.ok(!bundle.includes('usebruno.com'), 'the CDN is not hardcoded in the bundle: it arrives as data-cdn');
  assert.ok(bundle.includes('bruno.json'), 'the .bru parser and converter are bundled in, not fetched');
  assert.ok(fs.existsSync(path.join(here, '..', 'shell', 'shell.html')), 'the template ships beside it');
}

console.log('shell-test: all assertions passed');
