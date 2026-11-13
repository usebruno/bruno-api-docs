import { test, expect } from '../../playwright';

const PROD_HOST = 'https://api.prod.example.com';

test.use({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });

for (const variant of ['new', 'old'] as const) {
  test.describe(`A generated documentation file (${variant} mount call)`, () => {
    test.afterEach(({ exportedHtmlPage }) => {
      expect(exportedHtmlPage.consoleErrors).toEqual([]);
    });

    test('renders the overview', async ({ exportedHtmlPage, overviewPage }) => {
      await exportedHtmlPage.open(variant);

      await expect(overviewPage.root).toMatchAriaSnapshot({ name: 'overview.aria.yml' });
    });

    test('renders a request page', async ({ exportedHtmlPage, requestPage }) => {
      await exportedHtmlPage.open(variant, '#/alpha');

      await expect(requestPage.root).toMatchAriaSnapshot({ name: 'request.aria.yml' });
    });

    test('sends the request with the environment picked in the header', async ({
      page,
      exportedHtmlPage,
      requestPage,
      envSwitcher,
      responsePane
    }) => {
      await exportedHtmlPage.forwardToTestServer(PROD_HOST);
      await exportedHtmlPage.open(variant, '#/alpha');

      await envSwitcher.selectEnvironment('Prod');
      await requestPage.urlBar.tryButton.click();
      const sent = page.waitForRequest(`${PROD_HOST}/**`);
      await responsePane.send();

      expect((await sent).headers()['x-host']).toBe(PROD_HOST);
      await expect(responsePane.status).toContainText('200');
    });
  });
}
