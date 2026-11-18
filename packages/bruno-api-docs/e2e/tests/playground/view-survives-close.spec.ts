import { test, expect } from '../../playwright';

const GET_USERS_URL = '{{host}}/api/users?page=1&limit=10';
const USERS_BODY = '{"users":[{"id":1,"name":"Ada"}]}';
const OPEN_NO_REQUEST = /#\/\?pg=1&dock=bottom$/;

test.describe('Playground selection and view state across close, reopen and dock switches', () => {
  test.use({ viewport: { width: 1920, height: 900 } });

  test.beforeEach(async ({ page, responsePane }) => {
    await responsePane.mockUsersResponse(USERS_BODY);
    await page.goto('/#/?pg=1&dock=bottom');
  });

  test('going back to the playground url without a request keeps showing the last request', async ({
    page,
    playground
  }) => {
    await playground.openRequest('get users');
    await expect(page).toHaveURL(/pgReq=/);

    await page.goBack();

    await expect(page).toHaveURL(OPEN_NO_REQUEST);
    await expect(playground.urlInput).toHaveValue(GET_USERS_URL);
  });

  test('reopening the playground without a request in the url shows the request open before closing', async ({
    page,
    playground
  }) => {
    await playground.openRequest('get users');
    await page.goBack();
    await playground.close();
    await expect(playground.header).toHaveCount(0);

    await page.goBack();

    await expect(page).toHaveURL(OPEN_NO_REQUEST);
    await expect(playground.header).toBeVisible();
    await expect(playground.urlInput).toHaveValue(GET_USERS_URL);
  });

  test('reopening the playground without a request in the url shows Environments if it was open before closing', async ({
    page,
    playground
  }) => {
    await playground.gear.click();
    await expect(page).toHaveURL(/pgReq=(~|%7E)environments/);
    await page.goBack();
    await playground.close();

    await page.goBack();

    await expect(page).toHaveURL(OPEN_NO_REQUEST);
    await expect(playground.gear).toHaveClass(/active/);
    await expect(playground.urlInput).toHaveCount(0);
  });

  test('a changed response layout is kept after close and reopen', async ({ page, playground, responsePane }) => {
    await playground.openRequest('get users');
    await responsePane.send();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'horizontal');
    await responsePane.inlineChangeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');

    await playground.close();
    await page.goBack();

    await expect(playground.urlInput).toHaveValue(GET_USERS_URL);
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');
  });

  test('a changed response layout is kept across a dock switch', async ({ playground, responsePane }) => {
    await playground.openRequest('get users');
    await responsePane.send();
    await responsePane.inlineChangeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');

    await playground.selectDock('modal');

    await expect(playground.modalPanel).toBeVisible();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');
  });

  test('a chosen response format is kept after close and reopen and across a dock switch', async ({
    page,
    playground,
    responsePane
  }) => {
    await playground.openRequest('get users');
    await responsePane.send();
    await expect(responsePane.formatSelector).toHaveText('JSON');
    await responsePane.selectFormat('raw');
    await expect(responsePane.formatSelector).toHaveText('Raw');

    await playground.close();
    await page.goBack();
    await expect(responsePane.formatSelector).toHaveText('Raw');

    await playground.selectDock('modal');
    await expect(playground.modalPanel).toBeVisible();
    await expect(responsePane.formatSelector).toHaveText('Raw');
  });

  test('a turned-on response preview is kept after close and reopen and across a dock switch', async ({
    page,
    playground,
    responsePane
  }) => {
    await playground.openRequest('get users');
    await responsePane.send();
    await responsePane.openFormatSelector();
    expect(await responsePane.isPreviewOn()).toBe(false);
    await responsePane.togglePreview();
    await expect(responsePane.jsonPreview).toBeVisible();
    await page.keyboard.press('Escape');

    await playground.close();
    await page.goBack();
    await expect(responsePane.jsonPreview).toBeVisible();

    await playground.selectDock('modal');
    await expect(playground.modalPanel).toBeVisible();
    await expect(responsePane.jsonPreview).toBeVisible();
  });

  test('a folder opened from its chevron stays open after close and reopen', async ({ page, playground }) => {
    const customers = playground.treeItems.filter({ hasText: /^customers$/ });
    await expect(customers).toHaveCount(0);
    await playground.folderChevron('billing').click();
    await expect(customers).toHaveCount(1);

    await playground.close();
    await page.goBack();

    await expect(playground.header).toBeVisible();
    await expect(customers).toHaveCount(1);
  });

  test('a folder holding the open request, collapsed by hand, stays collapsed across a dock switch', async ({
    page,
    playground
  }) => {
    await page.goto('/#/?pg=1&dock=bottom&pgReq=billing/customers/get-all-customers');
    const request = playground.treeItems.filter({ hasText: 'Get All Customers' });
    await expect(request).toHaveCount(1);
    await playground.folderChevron('billing').click();
    await expect(request).toHaveCount(0);

    await playground.selectDock('modal');

    await expect(playground.modalPanel).toBeVisible();
    await expect(playground.urlInput).toBeVisible();
    await expect(request).toHaveCount(0);
  });
});

test.describe('Playground folders when a request is reopened or edited', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Try on the same request after closing re-opens the folders collapsed before closing', async ({
    requestPage,
    playground
  }) => {
    await requestPage.open(['billing', 'customers', 'Get Customers - Filter by Date Range']);
    await requestPage.urlBar.tryButton.click();
    const request = playground.treeItems.filter({ hasText: 'Get Customers - Filter by Date Range' });
    await expect(request).toHaveCount(1);
    await playground.folderChevron('billing').click();
    await expect(request).toHaveCount(0);

    await playground.close();
    await expect(playground.header).toHaveCount(0);
    await requestPage.urlBar.tryButton.click();

    await expect(playground.header).toBeVisible();
    await expect(request).toHaveCount(1);
  });

  test('a folder holding the open request, collapsed by hand, stays collapsed after a variable edit', async ({
    page,
    requestPage,
    playground
  }) => {
    await page.goto('/?fixture=vars');
    await requestPage.sidebar.open(['Customers', 'Variables Demo']);
    await requestPage.root.waitFor({ state: 'visible' });
    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');
    const request = playground.treeItems.filter({ hasText: 'Variables Demo' });
    await expect(request).toHaveCount(1);
    await playground.folderChevron('Customers').click();
    await expect(request).toHaveCount(0);

    await playground.variable.hoverInputToken('host');
    await playground.variable.editTo('https://edited.example.com');
    await expect(playground.variable.value).toHaveText('https://edited.example.com');

    await expect(request).toHaveCount(0);
  });
});
