import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { RequestPage } from '../../pages/request.page';

test.use({ colorScheme: 'light', viewport: { width: 1280, height: 720 } });

const GENERAL = '/?fixture=general';
const NO_ENV = '/?fixture=general-none';
const ONE_ENV = '/?fixture=general-one';

const DEV_HOST = 'https://api.dev.example.com';
const PROD_HOST = 'https://api.prod.example.com';
const STAGING_HOST = 'https://staging.example.com';
const SECRET = 'super-secret-token';
const SPECIAL = 'a<b>&"\'ü';
const ONLY_IN_DEV = 'from-dev';

const markDocument = (page: Page) =>
  page.evaluate(() => {
    (window as Window & { __doc?: number }).__doc = 1;
  });

const expectSameDocument = (page: Page) =>
  expect.poll(async () => {
    const read = () => page.evaluate(() => (window as Window & { __doc?: number }).__doc ?? null);
    const before = await read();
    await page.waitForTimeout(200);
    const after = await read();
    return { before, after };
  }).toEqual({ before: 1, after: 1 });

const expectTokens = async (tokens: Locator, text: string) => {
  await expect.poll(async () => {
    const values = await tokens.allTextContents();
    const shown = values.length > 0 && values.every((value) => value === text);
    return shown ? text : values;
  }).toBe(text);
};

const expectHosts = (surface: Locator, text: string) =>
  expectTokens(surface.getByTestId('variable-token-host'), text);

const openRequest = async (requestPage: RequestPage, name: string) => {
  await requestPage.sidebar.item(name).click();
  await expect(requestPage.title).toHaveText(name);
};

const surfacesOf = (requestPage: RequestPage) => [
  requestPage.urlBar.url,
  requestPage.section('headers'),
  requestPage.section('body'),
  requestPage.codeSnippet.code
];

test.describe('Variable resolution', () => {
  test('resolves placeholders in the URL, headers, body, and snippet when Show vars is on', async ({
    page,
    requestPage,
    envSwitcher
  }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');

    await expectHosts(requestPage.urlBar.url, '{{host}}');
    await markDocument(page);
    await envSwitcher.toggle();

    await expectHosts(requestPage.urlBar.url, DEV_HOST);
    await expectHosts(requestPage.section('headers'), DEV_HOST);
    await expectHosts(requestPage.section('body'), DEV_HOST);
    await expectHosts(requestPage.codeSnippet.code, DEV_HOST);
    await expectSameDocument(page);
  });

  test('puts placeholders back when Show vars is turned off', async ({ page, requestPage, envSwitcher }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();
    await expectHosts(requestPage.urlBar.url, DEV_HOST);

    await markDocument(page);
    await envSwitcher.toggle();

    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');
    for (const surface of surfacesOf(requestPage)) {
      await expectHosts(surface, '{{host}}');
    }
    await expectSameDocument(page);
  });

  test('keeps secret values masked in the URL, headers, body, and snippet when Show vars is on', async ({
    page,
    requestPage,
    envSwitcher
  }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();

    await expectHosts(requestPage.urlBar.url, DEV_HOST);
    for (const surface of surfacesOf(requestPage)) {
      await expectTokens(surface.getByTestId('variable-token-apiToken'), '{{apiToken}}');
    }
    await expect(requestPage.root).not.toContainText(SECRET);
  });

  test('stays consistent after Show vars is toggled', async ({ page, requestPage, envSwitcher }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');

    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');

    for (const surface of surfacesOf(requestPage)) {
      await expectHosts(surface, '{{host}}');
      await expectTokens(surface.getByTestId('variable-token-apiToken'), '{{apiToken}}');
    }

    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
    for (const surface of surfacesOf(requestPage)) {
      await expectHosts(surface, DEV_HOST);
      await expectTokens(surface.getByTestId('variable-token-apiToken'), '{{apiToken}}');
    }
  });

  test('updates resolved values on the same page, then on the next request, without reloading', async ({
    page,
    requestPage,
    envSwitcher
  }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();
    await expectHosts(requestPage.urlBar.url, DEV_HOST);
    await markDocument(page);

    await envSwitcher.selectEnvironment('Prod');
    await expectHosts(requestPage.urlBar.url, PROD_HOST);
    await expectHosts(requestPage.section('headers'), PROD_HOST);
    await expectHosts(requestPage.codeSnippet.code, PROD_HOST);
    await expectSameDocument(page);

    await openRequest(requestPage, 'Beta');
    await expectSameDocument(page);
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
    await expectHosts(requestPage.urlBar.url, PROD_HOST);
    await expectHosts(requestPage.codeSnippet.code, PROD_HOST);
  });

  test('keeps resolved values in sync across a couple of environment switches', async ({
    page,
    requestPage,
    envSwitcher
  }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();
    await markDocument(page);

    await envSwitcher.selectEnvironment('Prod');
    await expectHosts(requestPage.root, PROD_HOST);
    await envSwitcher.selectEnvironment('Dev');
    await expectHosts(requestPage.root, DEV_HOST);
    await envSwitcher.selectEnvironment('Prod');
    await expectHosts(requestPage.root, PROD_HOST);
    await expectSameDocument(page);
  });

  test('keeps resolved values after refresh and navigation', async ({ page, requestPage, envSwitcher }) => {
    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.selectEnvironment('Prod');
    await envSwitcher.toggle();
    await expectHosts(requestPage.urlBar.url, PROD_HOST);

    await page.reload();
    await expect(requestPage.title).toHaveText('Alpha');
    await expectHosts(requestPage.urlBar.url, PROD_HOST);

    await markDocument(page);
    await openRequest(requestPage, 'Beta');
    await expectSameDocument(page);
    await expectHosts(requestPage.urlBar.url, PROD_HOST);
  });

  test('leaves a variable that is missing from the active environment unresolved', async ({
    page,
    requestPage,
    envSwitcher
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();
    await expectTokens(requestPage.root.getByTestId('variable-token-onlyInDev'), ONLY_IN_DEV);

    await envSwitcher.selectEnvironment('Prod');

    await expectTokens(requestPage.root.getByTestId('variable-token-onlyInDev'), '{{onlyInDev}}');
    await expect(requestPage.root).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('renders special-character values as text', async ({ page, requestPage, envSwitcher }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(GENERAL);
    await openRequest(requestPage, 'Alpha');
    await envSwitcher.toggle();

    const tokens = requestPage.root.getByTestId('variable-token-special');
    await expectTokens(tokens, SPECIAL);
    const html = await tokens.first().innerHTML();
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
    expect(errors).toEqual([]);
  });

  test('resolves variables when the collection has a single environment', async ({ page, requestPage, envSwitcher }) => {
    await page.goto(ONE_ENV);
    await openRequest(requestPage, 'Ping');
    await envSwitcher.toggle();

    await expectHosts(requestPage.urlBar.url, STAGING_HOST);
    await expectHosts(requestPage.codeSnippet.code, STAGING_HOST);
  });

  test('shows an empty Environments page when none are included', async ({ page, sidebar, environmentsPage }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(NO_ENV);
    await sidebar.environments.click();

    await expect(environmentsPage.emptyState).toContainText('No environments configured');
    await expect(environmentsPage.emptyState).toContainText('no environments yet');
    expect(errors).toEqual([]);
  });
});
