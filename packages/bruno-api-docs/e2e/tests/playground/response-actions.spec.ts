import { test, expect } from '../../playwright';

// The response-pane action buttons (Copy, Download, Clear, Change Layout) only render once a
// response is present in the pane. `RequestExecutor` calls `fetch(resolvedUrl)` directly, so a
// send is made hermetic by mocking the sample collection's `get users` resolved URL
// (`{{host}}/api/users?…`, host = http://localhost:8081 in the Local env) rather than a proxy.
const USERS_BODY = '{"data":[{"id":1,"name":"Alice"}]}';

// At >= 640px the layout defaults to horizontal; the ChangeLayout button toggles it to vertical.
// The SplitDivider exposes the live orientation via its `data-orientation` attribute.
test.describe('response pane actions', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(USERS_BODY);
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();
    // The action buttons only mount after the response lands.
    await expect(responsePane.actions).toBeVisible();
  });

  test('renders Copy, Download, Clear and Change Layout, all enabled and clickable', async ({
    responsePane
  }) => {
    await expect(responsePane.copyButton).toBeVisible();
    await expect(responsePane.copyButton).toBeEnabled();
    await expect(responsePane.downloadButton).toBeVisible();
    await expect(responsePane.downloadButton).toBeEnabled();
    await expect(responsePane.clearButton).toBeVisible();
    await expect(responsePane.changeLayoutButton).toBeVisible();

    // Copy is clickable and the pane stays in its response state (no crash / no empty state).
    await responsePane.copyButton.click();
    await expect(responsePane.actions).toBeVisible();
  });

  test('Change Layout toggles the container orientation horizontal <-> vertical', async ({
    playground,
    responsePane
  }) => {
    // Wide viewport defaults to a horizontal split.
    await expect(playground.divider).toHaveAttribute('data-orientation', 'horizontal');

    await responsePane.changeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'vertical');

    await responsePane.changeLayoutButton.click();
    await expect(playground.divider).toHaveAttribute('data-orientation', 'horizontal');
  });

  test('Clear returns the pane to the empty "Click Send" state', async ({ responsePane }) => {
    await expect(responsePane.actions).toBeVisible();

    await responsePane.clearButton.click();

    await expect(responsePane.emptyHint).toBeVisible();
    // The status-bar actions are gone once the response is cleared.
    await expect(responsePane.actions).toHaveCount(0);
  });

  test('Download triggers a browser download of the response', async ({ page, responsePane }) => {
    const downloadPromise = page.waitForEvent('download');
    await responsePane.downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().length).toBeGreaterThan(0);
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
