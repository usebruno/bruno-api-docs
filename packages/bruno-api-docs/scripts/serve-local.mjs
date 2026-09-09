// Serve exported API docs against the LOCAL renderer build instead of the CDN.
//
//   node scripts/serve-local.mjs [--dir <exported-html-dir>] [--port 4600]
//
// Every exported document hard-codes `https://cdn.usebruno.com/api-docs/api-docs.js`.
// This server answers `/api-docs/*` from the local dist folders and rewrites the CDN
// origin to itself inside any HTML it serves, so an export renders against whatever
// you just built, with the file on disk untouched.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; };
const port = Number(arg('--port', 4600));
const pkg = resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsDir = resolve(arg('--dir', join(pkg, '../../examples/exported')));
const CDN = 'https://cdn.usebruno.com';

// The literal paths the documents and the two split shells load.
const bundles = {
  '/api-docs/api-docs.js': join(pkg, 'dist-standalone/api-docs.js'),
  '/api-docs/api-docs.css': join(pkg, 'dist-standalone/api-docs.css'),
  '/api-docs/docs.js': join(pkg, 'dist-docs/docs.js'),
  '/api-docs/docs.css': join(pkg, 'dist-docs/docs.css'),
  '/api-docs/playground.js': join(pkg, 'dist-playground/playground.js'),
  '/api-docs/playground.css': join(pkg, 'dist-playground/playground.css')
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.yml': 'text/yaml' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const origin = `http://localhost:${port}`;
  let file = bundles[path];
  if (!file) {
    const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
    file = join(docsDir, safe === '/' ? 'index.html' : safe);
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    let body = await readFile(file);
    const ext = extname(file);
    if (ext === '.html') body = Buffer.from(body.toString('utf8').replaceAll(CDN, origin));
    res.writeHead(200, { 'content-type': types[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(`not found: ${path}`);
  }
});

server.listen(port, async () => {
  console.log(`serving exported docs from ${docsDir}`);
  console.log(`rewriting ${CDN} -> http://localhost:${port}`);
  for (const [route, file] of Object.entries(bundles)) {
    try { const s = await stat(file); console.log(`  ${route.padEnd(28)} ${(s.size / 1024).toFixed(0).padStart(6)} kB  built ${s.mtime.toISOString()}`); }
    catch { console.log(`  ${route.padEnd(28)} MISSING (run the matching build)`); }
  }
});
