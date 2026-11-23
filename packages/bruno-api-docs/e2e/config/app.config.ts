export interface AppConfig {
  /** Base URL the docs app is served from (used as Playwright's `baseURL`). */
  baseURL: string;
  /** Command Playwright runs to start the app (the `webServer`). */
  webServerCommand: string;
  /** Origin of the e2e test server (`e2e/server/test-server.mjs`), separate from the app so CORS applies. */
  testServerURL: string;
  /** Serves the built standalone bundle and `e2e/server/standalone/` (same test server, own port). */
  standaloneURL: string;
}

export const appConfig: AppConfig = {
  baseURL: 'http://127.0.0.1:3001',
  webServerCommand: 'npm run dev',
  testServerURL: 'http://127.0.0.1:3900',
  standaloneURL: 'http://127.0.0.1:3901'
};
