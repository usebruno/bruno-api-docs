import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import { appConfig } from '../../config/app.config';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const PROD_HOST = 'https://api.prod.example.com';

const playgroundFileRequests = (page: Page): string[] => {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (/\/api-playground-[\w-]+\.js$/.test(new URL(request.url()).pathname)) urls.push(request.url());
  });
  return urls;
};

test.use({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });

for (const variant of ['new', 'old'] as const) {
  test(`a generated documentation file (${variant} mount call) loads the playground file only on Try, once`, async ({
    page,
    exportedHtmlPage,
    sidebar,
    requestPage,
    envSwitcher,
    playground,
    responsePane
  }) => {
    const loads = playgroundFileRequests(page);
    await exportedHtmlPage.forwardToTestServer(PROD_HOST);
    await exportedHtmlPage.open(variant);
    await sidebar.item('Beta').click();
    await expect(requestPage.title).toHaveText('Beta');
    await sidebar.item('Alpha').click();
    await expect(requestPage.title).toHaveText('Alpha');
    expect(loads).toEqual([]);

    await envSwitcher.selectEnvironment('Prod');
    await requestPage.urlBar.tryButton.click();
    const sent = page.waitForRequest(`${PROD_HOST}/**`);
    await responsePane.send();
    expect((await sent).headers()['x-host']).toBe(PROD_HOST);
    await expect(responsePane.status).toContainText('200');

    await playground.closeButton.click();
    await expect(playground.view).toHaveCount(0);
    await requestPage.urlBar.tryButton.click();
    await expect(playground.view).toBeVisible();

    expect(loads).toHaveLength(1);
    expect(loads[0]).toMatch(new RegExp(`^${appConfig.testServerURL}/api-docs/api-playground-`));
    expect(exportedHtmlPage.consoleErrors).toEqual([]);
  });
}

test.describe('The playground file on a host page', () => {
  test('is loaded once for two instances, and each playground sends', async ({ page, standalonePage }) => {
    const loads = playgroundFileRequests(page);
    await page.route('**/alpha**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' })
    );
    await standalonePage.goto();
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await standalonePage.mount('second', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');
    const second = standalonePage.instance('second');
    await first.sidebar.item('Alpha').click();
    await expect(first.requestPage.title).toHaveText('Alpha');
    expect(loads).toEqual([]);

    await first.requestPage.urlBar.tryButton.click();
    await first.responsePane.sendButton.click();
    await expect(first.responsePane.status).toHaveText('200 OK');
    await first.playground.closeButton.click();
    await expect(first.playground.view).toHaveCount(0);

    await second.sidebar.item('Alpha').click();
    await second.requestPage.urlBar.tryButton.click();
    await second.responsePane.sendButton.click();
    await expect(second.responsePane.status).toHaveText('200 OK');

    expect(loads).toHaveLength(1);
  });

  test('is loaded on first paint by a deep link to an open playground', async ({ page, standalonePage }) => {
    const loads = playgroundFileRequests(page);
    await standalonePage.goto('#/alpha?pg=1&dock=bottom&pgReq=alpha');
    await standalonePage.mount('first', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');

    await expect(first.playground.view).toContainText('Alpha');
    expect(loads).toHaveLength(1);
  });

  test('shows the load error when the file is missing and keeps the docs usable', async ({ page, standalonePage }) => {
    await page.route('**/api-playground-*', (route) => route.fulfill({ status: 404, body: 'not found' }));
    await standalonePage.goto('#/alpha');
    await standalonePage.mount('first', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');

    await first.requestPage.urlBar.tryButton.click();
    await expect(first.playground.loadError).toBeVisible();

    await first.sidebar.item('Beta').click();
    await expect(first.requestPage.title).toHaveText('Beta');
  });

  test('retries the file on the next open after a failed load', async ({ page, standalonePage }) => {
    const loads = playgroundFileRequests(page);
    let failures = 1;
    await page.route('**/api-playground-*', (route) =>
      failures-- > 0 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue()
    );
    await page.route('**/alpha**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' })
    );
    await standalonePage.goto('#/alpha');
    await standalonePage.mount('first', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');

    await first.requestPage.urlBar.tryButton.click();
    await expect(first.playground.loadError).toBeVisible();
    await first.playground.closeButton.click();
    await expect(first.playground.view).toHaveCount(0);

    await first.requestPage.urlBar.tryButton.click();
    await first.responsePane.sendButton.click();
    await expect(first.responsePane.status).toHaveText('200 OK');
    expect(loads).toHaveLength(2);
  });

  test('leaves the docs snippet highlighting alone when it loads', async ({ page, standalonePage }) => {
    await page.route('**/alpha**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' })
    );
    await standalonePage.goto('#/alpha');
    await standalonePage.mount('first', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');
    const { codeSnippet } = first.requestPage;
    const docsTokens = codeSnippet.code.getByTestId(/^variable-token-/);
    await expect(docsTokens).toHaveCount(10);

    const playgroundFile = page.waitForResponse(/\/api-playground-[\w-]+\.js$/);
    await first.requestPage.urlBar.tryButton.click();
    expect((await (await playgroundFile).text()).includes('highlightAll:function')).toBe(false);
    await first.responsePane.sendButton.click();
    await expect(first.responsePane.status).toHaveText('200 OK');
    await expect(docsTokens).toHaveCount(10);

    await first.playground.closeButton.click();
    await codeSnippet.selectLanguage('javascript');
    await expect(codeSnippet.code).toContainText('fetch(');
    await expect(docsTokens).toHaveCount(10);
  });

  test('highlights playground snippets with the shared javascript grammar', async ({ standalonePage }) => {
    await standalonePage.goto('#/alpha');
    await standalonePage.mount('first', { content: generalFixtureCollection });
    const first = standalonePage.instance('first');
    await first.requestPage.urlBar.tryButton.click();
    const { codeSnippet } = first.playground;
    await codeSnippet.openFromIcon();
    await codeSnippet.selectModalLanguage('javascript');

    await expect.poll(() => codeSnippet.modalTokenTexts('var-name')).toEqual(['options']);
  });
});
