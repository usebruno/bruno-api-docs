import { Buffer } from 'buffer';
import { test, expect } from '../../../playwright';

const BODY = '{"hello":"world"}';
const BASE64_BODY = Buffer.from(BODY).toString('base64');

test.describe('response formats — Base64', () => {
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

  test('re-encodes the response body as base64', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.selectFormat('base64');

    // The editor shows the raw response bytes base64-encoded, unchanged.
    await expect.poll(() => responsePane.bodyText()).toBe(BASE64_BODY);
  });
});
