import { test, expect } from '../../playwright';

// A compact JSON body whose encodings are easy to assert on: the raw bytes are
// printable ASCII, so hex/base64 have a predictable shape.
const BODY = '{"hello":"world"}';
const BASE64_BODY = Buffer.from(BODY).toString('base64');

test.describe('response body — editor formatting per format', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // 'get users' fetches `{{host}}/api/users?…` directly; intercept it so the test is
    // hermetic and doesn't depend on a live upstream.
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: BODY
      })
    );
  });

  test('renders JSON pretty and re-encodes as raw, hex and base64 on format change', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // JSON default: prettified with indentation and quoted keys.
    await expect(responsePane.bodyEditor.root.locator('.monaco-editor')).toBeVisible();
    await expect
      .poll(() => responsePane.bodyText())
      .toContain('"hello": "world"');

    // Raw: the decoded body verbatim, without JSON pretty-printing.
    await responsePane.selectFormat('raw');
    await expect.poll(() => responsePane.bodyText()).toBe(BODY);

    // Hex: a hex dump — address column, uppercase hex bytes, ASCII gutter.
    await responsePane.selectFormat('hex');
    await expect.poll(() => responsePane.bodyText()).toContain('00000000:');
    await expect(await responsePane.bodyText()).toMatch(/00000000:\s+([0-9A-F]{2}\s+)+/);

    // Base64: the raw base64 string, unchanged.
    await responsePane.selectFormat('base64');
    await expect.poll(() => responsePane.bodyText()).toBe(BASE64_BODY);
  });
});

// A minimal 1x1 PNG — the magic-number sniffer classifies it as a byte format, so the
// structured decoders (JSON/HTML/XML/Javascript) must not be offered.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('response body — binary responses', () => {
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

  test('hides structured formats and keeps a manual preview toggle across a re-render', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();

    // Byte formats stay; the structured decoders are dropped entirely for binary content.
    await expect(responsePane.formatOption('raw')).toBeVisible();
    await expect(responsePane.formatOption('hex')).toBeVisible();
    await expect(responsePane.formatOption('base64')).toBeVisible();
    await expect(responsePane.formatOption('json')).toHaveCount(0);
    await expect(responsePane.formatOption('html')).toHaveCount(0);
    await expect(responsePane.formatOption('xml')).toHaveCount(0);
    await expect(responsePane.formatOption('javascript')).toHaveCount(0);

    // An image defaults to preview on; flip it off manually.
    expect(await responsePane.isPreviewOn()).toBe(true);
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(false);

    // A benign re-render with an unchanged content type must not clobber the manual choice:
    // re-fetch the identical image response and confirm Preview is still off. (Re-fetching is a
    // stable, always-available trigger — the response tab bar overflows unpredictably across
    // viewports, so a tab switch would be flaky here.)
    await page.keyboard.press('Escape'); // close the format dropdown before re-sending
    await responsePane.send();

    await responsePane.openFormatSelector();
    expect(await responsePane.isPreviewOn()).toBe(false);
  });
});
