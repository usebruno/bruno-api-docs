// Nest is the only wrapper that has to work out the path itself: on platform-fastify the
// middleware is handed `/` whatever was requested. Run: npm run test:nestjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { subPathOf } = require(path.join(here, '..', 'dist', 'index.js'));

// --- the ordinary mount
assert.equal(subPathOf('/docs', '/docs'), '/', 'the mount itself is the root of the docs');
assert.equal(subPathOf('/docs/', '/docs'), '/');
assert.equal(subPathOf('/docs/shell.js', '/docs'), '/shell.js');
assert.equal(subPathOf('/docs/collection.yml', '/docs'), '/collection.yml');
assert.equal(subPathOf('/docs/catalog/list/', '/docs'), '/catalog/list/', 'any depth, for deep links');
assert.equal(subPathOf('/docs/shell.js?v=2', '/docs'), '/shell.js?v=2', 'the query survives, the handler strips it');

// --- a mount several segments deep
assert.equal(subPathOf('/api/v2/docs/shell.js', '/api/v2/docs'), '/shell.js');

// --- setGlobalPrefix: Nest applies it to middleware routes, so a /docs mount answers at /api/docs
assert.equal(subPathOf('/api/docs/shell.js', '/docs'), '/shell.js', 'the prefix in front of the mount is skipped');
assert.equal(subPathOf('/api/docs/', '/docs'), '/');
assert.equal(subPathOf('/api/docs', '/docs'), '/');

// --- nothing to match
assert.equal(subPathOf('/somewhere-else', '/docs'), '/somewhere-else', 'left alone rather than guessed at');

console.log('sub-path-test: all assertions passed');
