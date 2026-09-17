import { test, expect } from '@playwright/test';

// What a reader actually gets. check.sh proves the bytes; this proves the page built from them.

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

test('a deep link renders on its own, after a reload', async ({ page }) => {
  const errors = consoleErrorsOn(page);
  await page.goto('/docs/catalog/list-products/', { waitUntil: 'networkidle' });
  await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
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
