import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { appConfig } from '../config/app.config';

export type ExportedHtmlVariant = 'new' | 'old';

/**
 * An HTML file as Bruno's "Generate Documentation" writes it (`e2e/server/standalone/exported-*.html`),
 * served from the standalone origin while its `api-docs.js`/`.css` load from the test server origin,
 * the way an exported file loads them from the CDN. `new` mounts with `Bruno.apiDocs`, `old` with the
 * deprecated `new window.OpenCollection`.
 */
export class ExportedHtmlPage extends BasePage {
  readonly root = this.page.locator('#opencollection-container');
  readonly consoleErrors: string[] = [];

  constructor(page: Page) {
    super(page);
    page.on('console', (message) => {
      if (message.type() === 'error') this.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => this.consoleErrors.push(error.message));
  }

  async open(variant: ExportedHtmlVariant, hash = ''): Promise<void> {
    await this.goto(`${appConfig.standaloneURL}/exported-${variant}.html${hash}`);
  }

  async forwardToTestServer(origin: string): Promise<void> {
    await this.page.route(`${origin}/**`, async (route) => {
      const response = await route.fetch({ url: `${appConfig.testServerURL}/echo` });
      await route.fulfill({ response });
    });
  }
}
