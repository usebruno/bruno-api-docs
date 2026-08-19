import { Buffer } from 'buffer';
import { test, expect } from '../../../playwright';

// A 1x1 PNG. The magic-number sniffer classifies it as image/png, a byte format.
const PNG_BASE64
  = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const PNG_SRC = `data:image/png;base64,${PNG_BASE64}`;

test.describe('response formats — image', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'image/png' },
        body: PNG_BYTES
      })
    );
  });

  test('previews the image and drops the structured decoders', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // An image defaults to a rendered <img> preview built from the base64 body.
    await expect(responsePane.previewImage).toBeVisible();
    await expect(responsePane.previewImage).toHaveAttribute('src', PNG_SRC);

    // The browser actually decoded the data URL: a broken src leaves naturalWidth at 0.
    await expect
      .poll(() =>
        responsePane.previewImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
      )
      .toBe(true);

    // Binary content only offers the byte formats; the structured decoders are dropped.
    await responsePane.openFormatSelector();
    await expect(responsePane.formatOption('base64')).toBeVisible();
    await expect(responsePane.formatOption('hex')).toBeVisible();
    await expect(responsePane.formatOption('raw')).toBeVisible();
    await expect(responsePane.formatOption('json')).toHaveCount(0);
    await expect(responsePane.formatOption('html')).toHaveCount(0);
    await expect(responsePane.formatOption('xml')).toHaveCount(0);
    await expect(responsePane.formatOption('javascript')).toHaveCount(0);

    // Base64 is the default selection for an image, with preview on.
    expect(await responsePane.isPreviewOn()).toBe(true);
  });

  test('source view shows the base64 bytes and a hex dump when preview is off', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // Turn the default image preview off to drop into the Monaco byte view.
    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(false);

    // Base64 (the default byte format) shows the PNG bytes base64-encoded. The editor soft-wraps the
    // long string across view-lines, so strip the wrap breaks before comparing.
    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(async () => (await responsePane.bodyText()).replace(/\s/g, '')).toBe(PNG_BASE64);

    // Hex shows the same bytes as an offset + hex-pair dump. The dropdown is still open from the
    // preview toggle, so pick the option directly rather than reopening it.
    await responsePane.formatOption('hex').click();
    await expect.poll(() => responsePane.bodyText()).toContain('00000000:');
    expect(await responsePane.bodyText()).toMatch(/00000000:\s+([0-9A-F]{2}\s+)+/);
  });
});
