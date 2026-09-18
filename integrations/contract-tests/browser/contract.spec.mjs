import { test, expect } from '@playwright/test';

// What our shell and server promise a reader, seen from a browser. check.sh proves the bytes; this
// proves the page built from them. Everything here is ours to fix when it fails.

const LOCAL_TOKEN = 'local-token-safe-to-publish';

const consoleErrorsOn = (page) => {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
    }
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  return errors;
};

test('the docs render, and nothing in the console complains', async ({ page }) => {
  const errors = consoleErrorsOn(page);
  await page.goto('/docs/', { waitUntil: 'networkidle' });

  await expect(page).toHaveTitle('Acme API');
  await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#bruno-docs-error')).toBeHidden();
  expect(errors, 'the adopter CSP we document must not break the renderer').toEqual([]);
});

test('the renderer booted, from the CDN, with our shell from our own origin', async ({ page }) => {
  const sources = [];
  page.on('request', (r) => sources.push(r.url()));
  await page.goto('/docs/', { waitUntil: 'networkidle' });

  expect(sources.some((u) => u.endsWith('/docs/shell.js')), 'shell.js is same-origin').toBe(true);
  expect(sources.some((u) => u.startsWith('https://cdn.usebruno.com/')), 'the renderer is the CDN bundle').toBe(true);
  expect(await page.evaluate(() => typeof window.OpenCollection)).toBe('function');

  // the shell boots through window.Bruno first when it exists. The day the CDN bundle ships it,
  // this fails on purpose: re-check the boot order and the options we pass, then update it.
  expect(await page.evaluate(() => typeof window.Bruno), 'window.Bruno has appeared on the CDN bundle').toBe('undefined');
});

test('the filters hold all the way to the page', async ({ page }) => {
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  const text = await page.evaluate(() => document.body.innerText);

  await expect(page.getByText('Mixed', { exact: true }).first()).toBeVisible();
  expect(text, 'a folder whose only request was tagged is pruned').not.toContain('Internal');

  for (const hidden of ['Reindex catalog', 'Purge cache', 'Drain node']) {
    expect(text, `${hidden} is tagged internal and must not reach a reader`).not.toContain(hidden);
  }

  expect(text, 'only the published environment is offered').toContain('Local');
  expect(text, 'an unpublished environment is not named').not.toContain('Prod');
  expect(text, 'and its values never left the server').not.toContain('prod-token-must-never-be-served');
});

test('the page is served at any depth, and the renderer routes by hash', async ({ page }) => {
  const errors = consoleErrorsOn(page);

  // any path under the mount is the page: a proxy or a hand-typed URL lands on the docs
  await page.goto('/docs/catalog/list-products/', { waitUntil: 'networkidle' });
  await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();

  // the link that opens a request is the renderer's hash route, and it survives a reload
  await page.goto('/docs/#/catalog/list-products', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-page-slug="catalog/list-products"]')).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-page-slug="catalog/list-products"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('try it sends the published environment, and only that', async ({ page }) => {
  let sent;
  // the fixture's baseUrl points at a port nothing listens on; answer for it and keep the request
  await page.route('**/products', async (route) => {
    sent = route.request();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  });

  await page.goto('/docs/#/catalog/list-products', { waitUntil: 'networkidle' });
  await page.getByTestId('request-try-button').click();
  await page.getByTestId('query-bar-send').click();
  await expect.poll(() => sent, 'the request left the browser').toBeTruthy();

  const headers = await sent.allHeaders();
  expect(headers.authorization, 'the collection auth, resolved from the Local environment').toBe(`Bearer ${LOCAL_TOKEN}`);
  expect(sent.url(), 'the Local baseUrl was interpolated').toContain('localhost:5456/products');
});

test('a bundled single file renders the same way', async ({ page }) => {
  await page.goto('/bundled/docs/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle('API Documentation');
  await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();
});

test('a broken mount explains itself in the page, and the app is still up', async ({ page, request }) => {
  const response = await page.goto('/broken/docs/', { waitUntil: 'networkidle' });

  // every route of a failed mount serves the reason directly, so there is no shell to fail inside
  expect(response.status()).toBe(404);
  await expect(page.getByText('Collection not found')).toBeVisible();
  expect(await page.locator('#bruno-docs').count(), 'no half-built page is served').toBe(0);

  expect((await request.get('/control')).status(), 'the host app is unaffected').toBe(200);
});

test('when the CDN is unreachable, the shell says so instead of a blank page', async ({ page }) => {
  await page.route('https://cdn.usebruno.com/**', (route) => route.abort());
  await page.goto('/docs/', { waitUntil: 'networkidle' });

  const box = page.locator('#bruno-docs-error');
  await expect(box).toBeVisible();
  await expect(box).toContainText('renderer bundle did not load');
  await expect(box, 'it names the origin the adopter has to allow').toContainText('cdn.usebruno.com');
  await expect(page.locator('#bruno-docs')).toBeHidden();
});
