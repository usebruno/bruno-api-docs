import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { appConfig } from './e2e/config/app.config';

const [, testServer] = base.webServer as NonNullable<typeof base.webServer>[];

export default defineConfig({
  ...base,
  testDir: './e2e/tests/standalone',
  testIgnore: undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/standalone' }],
    ['json', { outputFile: 'playwright-report/standalone/results.json' }],
  ],
  webServer: [
    testServer,
    {
      command: 'npm run build:lib-bundle && npm run build:standalone && node e2e/server/test-server.mjs',
      url: `${appConfig.standaloneURL}/health`,
      env: { PORT: new URL(appConfig.standaloneURL).port },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
