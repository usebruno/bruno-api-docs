import { test, expect } from '../../../playwright';

// A minimal HTML document. Served as text/html so the pane defaults to the HTML preview.
const BODY
  = '<!doctype html><html><head><title>Doc</title></head>'
    + '<body><h1>Hello HTML</h1><p>paragraph text</p></body></html>';

test.describe('response formats — HTML', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: BODY
      })
    );
  });

  test('defaults to a sandboxed, scriptless iframe preview', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // text/html opens straight into the preview iframe — no Monaco editor.
    await expect(responsePane.htmlPreview).toBeVisible();
    await expect(responsePane.bodyEditorCanvas).toHaveCount(0);

    // The iframe is sandboxed without script execution.
    await expect(responsePane.htmlPreview).toHaveAttribute('sandbox', 'allow-same-origin');

    // The response HTML is actually rendered inside the frame.
    await expect(responsePane.htmlPreviewBody().getByRole('heading', { name: 'Hello HTML' })).toBeVisible();
  });

  test('shows the prettified HTML source when preview is toggled off', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();
    expect(await responsePane.isPreviewOn()).toBe(true);
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(false);

    // Turning preview off reveals the prettified HTML markup in the Monaco editor.
    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toContain('Hello HTML');
    expect(await responsePane.bodyText()).toContain('<h1>');
    // prettified: the single-line document is broken onto multiple indented lines.
    expect((await responsePane.bodyText()).split('\n').length).toBeGreaterThan(1);
  });
});
