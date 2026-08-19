import { test, expect } from '../../../playwright';

// Plain text. Served as text/plain so the pane falls back to the Raw decoder.
const BODY = 'plain text line one\nplain text line two';

const ALL_FORMATS = ['json', 'html', 'xml', 'javascript', 'raw', 'hex', 'base64'] as const;

test.describe('response formats — Raw (text/plain)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: BODY
      })
    );
  });

  test('defaults to the Raw source view and keeps every decoder available', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // text/plain has no structured decoder, so Raw is the default and the body is echoed verbatim
    // (no pretty-printing), preserving the original line breaks.
    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toBe(BODY);

    // It's still text (not a byte format), so all seven decoders remain selectable.
    await responsePane.openFormatSelector();
    for (const format of ALL_FORMATS) {
      await expect(responsePane.formatOption(format)).toBeVisible();
    }
    expect(await responsePane.isPreviewOn()).toBe(false);
  });

  test('renders monospace text in preview', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(true);

    await expect(responsePane.textPreview).toBeVisible();
    await expect(responsePane.bodyEditorCanvas).toHaveCount(0);
    await expect(responsePane.textPreview).toContainText('plain text line one');
  });
});
