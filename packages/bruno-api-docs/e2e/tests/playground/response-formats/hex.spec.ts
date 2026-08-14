import { test, expect } from '../../../playwright';

// A body whose raw bytes are printable ASCII, so the hex dump has a predictable shape.
const BODY = '{"hello":"world"}';

test.describe('response formats — Hex', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: BODY
      })
    );
  });

  test('re-encodes the response body as a hex dump', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.selectFormat('hex');

    // A hex dump: an offset column, then uppercase hex byte pairs.
    await expect.poll(() => responsePane.bodyText()).toContain('00000000:');
    expect(await responsePane.bodyText()).toMatch(/00000000:\s+([0-9A-F]{2}\s+)+/);
  });
});
