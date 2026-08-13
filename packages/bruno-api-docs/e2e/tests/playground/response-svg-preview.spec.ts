import { Buffer } from 'buffer';
import { test, expect } from '../../playwright';

// A small SVG whose bytes the sniffer classifies as image/svg+xml. Small SVG bodies are kept as
// selectable text (no base64 copy), so the preview must build the <img> src from that text —
// regression: it used to read the absent base64 buffer and render "base64,undefined".
const SVG_BODY
  = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">'
    + '<rect width="400" height="300" fill="red"/></svg>';
const INLINE_SVG_SRC = `data:image/svg+xml;base64,${Buffer.from(SVG_BODY).toString('base64')}`;

test.describe('response body — SVG preview', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'image/svg+xml' },
        body: SVG_BODY
      })
    );
  });

  test('renders the SVG image from its inline markup, not a broken data URL', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // An SVG is an image, so the pane defaults to preview and renders an <img>.
    await expect(responsePane.previewImage).toBeVisible();

    // The src is the SVG markup encoded inline — not the "base64,undefined" the bug produced.
    await expect(responsePane.previewImage).toHaveAttribute('src', INLINE_SVG_SRC);

    // And the browser actually decoded it: a broken data URL leaves naturalWidth at 0.
    await expect
      .poll(() =>
        responsePane.previewImage.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
        )
      )
      .toBe(true);
  });
});
