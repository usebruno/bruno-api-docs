import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// EXAMPLE and PORT are how another language core points this at its own server. The spec itself
// asserts only what the contract promises, so it does not care which one booted.
const EXAMPLE = process.env.EXAMPLE || 'nodejs/express/example/server.js';
const PORT = process.env.PORT || '5462';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // the renderer comes from the CDN, and there is no `cdn` option to point elsewhere, so this
    // layer needs the network. That is the trade for not shipping a self-hosted bundle yet.
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `node ${EXAMPLE}`,
    cwd: ROOT,
    env: { ...process.env, PORT },
    port: Number(PORT),
    reuseExistingServer: false,
    timeout: 30_000
  }
});
