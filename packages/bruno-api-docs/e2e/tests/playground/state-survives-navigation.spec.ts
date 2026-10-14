import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';
import type { ResponsePaneComponent } from '../../components/playground/response-pane.component';

const DEV_HOST = 'https://api.dev.example.com';
const PROD_HOST = 'https://api.prod.example.com';

const mockEndpoint = (page: Page, path: string, body: string) =>
  page.route(`**/${path}**`, (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body })
  );

const sendAndCaptureUrl = async (page: Page, responsePane: ResponsePaneComponent): Promise<string> => {
  const [request] = await Promise.all([page.waitForRequest('**/alpha**'), responsePane.send()]);
  return request.url();
};

const openPlayground = async (page: Page, playground: PlaygroundComponent) => {
  await page.goto('/?fixture=general#/?pg=1&dock=bottom');
  await playground.runner.waitFor({ state: 'visible' });
};

test.describe('Playground state survives navigation inside the page', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Try it opens the playground with the environment selected in the docs', async ({
    page,
    requestPage,
    envSwitcher,
    playground,
    responsePane
  }) => {
    await mockEndpoint(page, 'alpha', '{}');
    await page.goto('/?fixture=general');
    await requestPage.sidebar.item('Alpha').click();
    await expect(requestPage.title).toHaveText('Alpha');
    await envSwitcher.selectEnvironment('Prod');

    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });

    await expect(playground.envSwitcher.trigger).toContainText('Prod');
    expect(await sendAndCaptureUrl(page, responsePane)).toMatch(new RegExp(`^${PROD_HOST}/alpha`));
  });

  test('switching the environment in the playground changes where the request is sent', async ({
    page,
    playground,
    responsePane
  }) => {
    await mockEndpoint(page, 'alpha', '{}');
    await openPlayground(page, playground);
    await playground.openRequest('Alpha');

    await playground.envSwitcher.selectEnvironment('Dev');
    expect(await sendAndCaptureUrl(page, responsePane)).toMatch(new RegExp(`^${DEV_HOST}/alpha`));

    await playground.envSwitcher.selectEnvironment('Prod');
    expect(await sendAndCaptureUrl(page, responsePane)).toMatch(new RegExp(`^${PROD_HOST}/alpha`));
  });

  test('a response is kept when moving to another request and back, and after close and reopen', async ({
    page,
    playground,
    responsePane,
    requestPage
  }) => {
    await mockEndpoint(page, 'alpha', '{"from":"alpha"}');
    await openPlayground(page, playground);
    await playground.openRequest('Alpha');
    await playground.envSwitcher.selectEnvironment('Dev');
    await responsePane.send();
    await expect(responsePane.status).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toContain('"from": "alpha"');

    await playground.openRequest('Beta');
    await expect(responsePane.emptyHint).toBeVisible();

    await playground.openRequest('Alpha');
    await expect.poll(() => responsePane.bodyText()).toContain('"from": "alpha"');

    await playground.close();
    await expect(playground.header).toHaveCount(0);
    await requestPage.sidebar.item('Alpha').click();
    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });
    await expect.poll(() => responsePane.bodyText()).toContain('"from": "alpha"');
  });

  test('a URL edit typed just before a dock switch is kept in every dock', async ({ page, playground }) => {
    await openPlayground(page, playground);
    await playground.openRequest('Alpha');

    await playground.urlInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type('&docked=1');

    await playground.selectDock('inline');
    await expect(playground.inlinePanel).toBeVisible();
    await expect(playground.urlInput).toHaveValue(/&docked=1$/);

    await playground.selectDock('modal');
    await expect(playground.modalPanel).toBeVisible();
    await expect(playground.urlInput).toHaveValue(/&docked=1$/);
  });
});
