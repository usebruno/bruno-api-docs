import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// APP and PORT are how another language core points this at its own server. The specs assert
// only what the contract promises, so they do not care which one booted.
const APP = process.env.APP || 'contract-tests/apps/express.js';
// 5456 is the fixture's Local baseUrl: try it hits the same origin, as it does when the docs live in the API
const PORT = process.env.PORT || '5456';

// two tiers. `contract` is what our shell and server promise, and a failure there is ours.
// `renderer` is the renderer's own behaviour reached through our mount, and a failure there is
// something to tell them, so CI runs it without blocking: npx playwright test --project renderer
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [
    ['list'],
    ...(process.env.JUNIT_DIR ? [['junit', { outputFile: path.join(ROOT, process.env.JUNIT_DIR, 'browser.xml') }]] : [])
  ],
  projects: [
    { name: 'contract', testMatch: /contract\.spec\.mjs/ },
    { name: 'renderer', testMatch: /renderer\.spec\.mjs/ }
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // the renderer comes from the CDN, and there is no `cdn` option to point elsewhere, so this
    // layer needs the network. That is the trade for not shipping a self-hosted bundle yet.
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `node ${APP}`,
    cwd: ROOT,
    env: { ...process.env, PORT },
    port: Number(PORT),
    reuseExistingServer: false,
    timeout: 30_000
  }
});
