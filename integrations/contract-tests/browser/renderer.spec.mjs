import { test, expect } from '@playwright/test';

// The renderer's own behaviour, reached through our mount. These are the things a reader does on
// the page: pick an environment, open a request, search, use a phone. They lean on the renderer's
// data-testids, so a failure here is most likely theirs to know about, not ours to fix. CI runs
// this project without blocking.

test('the environment switcher offers exactly what was published', async ({ page }) => {
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  await page.getByLabel('Select environment').first().click();

  const menu = page.getByRole('menu');
  await expect(menu.getByText('Local', { exact: true })).toBeVisible();
  await expect(menu.getByText('Prod', { exact: true })).toHaveCount(0);
});

test('a request page shows its method and the interpolated URL', async ({ page }) => {
  await page.goto('/docs/#/catalog/list-products', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('request-method').first()).toHaveText(/GET/i);
  await expect(page.getByText('/products').first()).toBeVisible();
});

test('the sidebar keeps the collection order', async ({ page }) => {
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  const slugs = () => page.locator('[data-slug]').evaluateAll((els) => els.map((el) => el.dataset.slug));

  // folders come collapsed; their seq decides the order
  expect(await slugs()).toEqual(['catalog', 'mixed']);

  await page.getByRole('button', { name: 'Expand folder' }).first().click();
  expect(await slugs()).toEqual(['catalog', 'catalog/list-products', 'catalog/get-product', 'mixed']);
});

test('the logo we forwarded is what the renderer shows', async ({ page }) => {
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  await expect(page.locator('img[src^="data:image/svg+xml"]').first()).toBeVisible();
});

test('search opens on the keyboard and respects the filters', async ({ page }) => {
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  await page.keyboard.press('ControlOrMeta+k');

  const input = page.getByLabel('Search requests and folders');
  await expect(input).toBeFocused();
  await input.fill('prod');

  const results = page.getByTestId('search-results');
  await expect(results).toContainText('List products');
  await expect(results).toContainText('Get product');

  // reindex is tagged internal: not on the page, and not in the index either
  await input.fill('reindex');
  await expect(page.getByText('No matches')).toBeVisible();
});

test('on a phone the sidebar is a drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/', { waitUntil: 'networkidle' });

  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(page.getByTestId('app-sidebar'), 'no fixed sidebar on a phone').toHaveCount(0);
  await expect(drawer).toBeHidden();

  await page.getByLabel('Toggle sidebar').click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Catalog', { exact: true })).toBeVisible();
});
