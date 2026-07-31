import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';

// The response-pane actions (Copy, Download, Clear, Change Layout) only render once a response is
// present in the pane. `RequestExecutor` calls `fetch(resolvedUrl)` directly, so a send is made
// hermetic by mocking the sample collection's `get users` resolved URL (`{{host}}/api/users?…`,
// host = http://localhost:8081 in the Local env) rather than a proxy.
const USERS_BODY = '{"data":[{"id":1,"name":"Alice"}]}';

// Read and parse the clipboard, returning null while it is still empty/unparseable so `expect.poll`
// can retry until the async copy lands.
const readClipboardJson = (page: Page): Promise<unknown> =>
  page.evaluate(async () => {
    try {
      return JSON.parse(await navigator.clipboard.readText());
    } catch {
      return null;
    }
  });

// At the default (narrow) playground width the actions collapse into a kebab menu; each action is a
// menu item.
test.describe('response pane actions — collapsed', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(USERS_BODY);
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();
    // The actions only mount after the response lands.
    await expect(responsePane.actions).toBeVisible();
  });

  test('collapses into a kebab menu exposing Copy, Download, Clear and Change Layout', async ({
    responsePane
  }) => {
    await expect(responsePane.actionsMenuTrigger).toBeVisible();

    await responsePane.openActionsMenu();
    await expect(responsePane.copyMenuItem).toBeVisible();
    await expect(responsePane.downloadMenuItem).toBeVisible();
    await expect(responsePane.clearMenuItem).toBeVisible();
    await expect(responsePane.layoutMenuItem).toBeVisible();

    // Copy is clickable and the pane stays in its response state (no crash / no empty state).
    await responsePane.copyMenuItem.click();
    await expect(responsePane.actions).toBeVisible();
  });

  test('Copy writes the response body to the clipboard', async ({ page, responsePane }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await responsePane.openActionsMenu();
    await responsePane.copyMenuItem.click();

    // The copied text is pretty-printed JSON, so compare the parsed value rather than the raw string.
    await expect.poll(() => readClipboardJson(page)).toEqual(JSON.parse(USERS_BODY));
  });

  test('Clear returns the pane to the empty "Click Send" state', async ({ responsePane }) => {
    await responsePane.openActionsMenu();
    await responsePane.clearMenuItem.click();

    await expect(responsePane.emptyHint).toBeVisible();
    // The status-bar actions are gone once the response is cleared.
    await expect(responsePane.actions).toHaveCount(0);
  });

  test('Download triggers a browser download of the response', async ({ page, responsePane }) => {
    const downloadPromise = page.waitForEvent('download');
    await responsePane.openActionsMenu();
    await responsePane.downloadMenuItem.click();
    const download = await downloadPromise;
    // JSON body with no Content-Disposition and a `/api/users` path → the content-type extension.
    expect(download.suggestedFilename()).toBe('response.json');
  });
});

// When the response pane is wide enough, the actions expand from the kebab into inline buttons. At
// this width the pane stays wide in both orientations, so the inline Change-Layout button persists.
test.describe('response pane actions — expanded', () => {
  test.use({ viewport: { width: 1920, height: 900 } });

  test.beforeEach(async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(USERS_BODY);
    await page.goto('/#/?pg=1');
    await playground.openSidebarItem('get users');
    await responsePane.send();
    await expect(responsePane.actions).toBeVisible();
  });

  test('shows the actions as inline buttons instead of the kebab menu', async ({ responsePane }) => {
    await expect(responsePane.inlineButtons).toBeVisible();
    await expect(responsePane.actionsMenuTrigger).toBeHidden();
    await expect(responsePane.inlineCopyButton).toBeVisible();
  });

  test('Copy writes the response body to the clipboard from the inline button', async ({
    page,
    responsePane
  }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await responsePane.inlineCopyButton.click();

    await expect.poll(() => readClipboardJson(page)).toEqual(JSON.parse(USERS_BODY));
  });

  test('Download triggers a browser download from the inline button', async ({ page, responsePane }) => {
    const downloadPromise = page.waitForEvent('download');
    await responsePane.inlineDownloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('response.json');
  });

  test('Clear returns the pane to the empty state from the inline button', async ({ responsePane }) => {
    await responsePane.inlineClearButton.click();

    await expect(responsePane.emptyHint).toBeVisible();
    await expect(responsePane.actions).toHaveCount(0);
  });

  test('Change Layout toggles the container orientation horizontal <-> vertical', async ({
    playground,
    responsePane
  }) => {
    await expect(playground.divider).toHaveAttribute('data-orientation', 'horizontal');

    await responsePane.inlineChangeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');

    await responsePane.inlineChangeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'horizontal');
  });
});

// A response over the 10MB threshold swaps the body for the Large Response Warning banner, which
// carries its own View / Copy / Download controls. An ~11MB JSON string trips the threshold.
const LARGE_BODY = `{"blob":"${'x'.repeat(11 * 1024 * 1024)}"}`;

test.describe('large response warning actions', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('shows the banner with View, Copy and Download controls', async ({
    page,
    playground,
    responsePane
  }) => {
    await responsePane.mockUsersResponse(LARGE_BODY);
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await expect(responsePane.largeResponseWarning).toBeVisible();
    await expect(responsePane.largeResponseView).toBeVisible();
    await expect(responsePane.largeResponseCopy).toBeVisible();
    await expect(responsePane.largeResponseDownload).toBeVisible();
    await expect(responsePane.largeResponseDownload).toBeEnabled();

    // Copy and Download are clickable without dismissing the banner.
    await responsePane.largeResponseCopy.click();
    await expect(responsePane.largeResponseWarning).toBeVisible();
  });
});
