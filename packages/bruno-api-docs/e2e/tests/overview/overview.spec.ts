import { test, expect } from '../../playwright';
import type { Locator } from '@playwright/test';

const boundingBoxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('expected the element to have a bounding box');
  return box;
};

test.describe('Collection Overview', () => {
  test.beforeEach(async ({ overviewPage }) => {
    await overviewPage.goto();
  });

  test('header shows the collection version ("Version : 1.0.0") and name ("Bruno Testbench")', async ({ overviewPage }) => {
    await test.step('the raw version is shown, unformatted', async () => {
      await expect(overviewPage.header.collectionVersion).toHaveText('Version : 1.0.0');
    });

    await test.step('the collection name is shown as the page title', async () => {
      await expect(overviewPage.header.collectionName).toHaveText('Bruno Testbench');
    });
  });

  test('shows three stat cards with the request (48), folder (7) and environment (2) counts', async ({ overviewPage }) => {
    await expect(overviewPage.stats.cards).toHaveCount(3);
    await expect(overviewPage.stats.valueFor('Requests')).toHaveText('48');
    await expect(overviewPage.stats.valueFor('Folders')).toHaveText('7');
    await expect(overviewPage.stats.valueFor('Environments')).toHaveText('2');
  });

  test('renders the collection documentation under the "Overview" section', async ({ overviewPage }) => {
    await expect(overviewPage.sectionLabel('Overview')).toBeVisible();
    await expect(overviewPage.docMarkdown.root).toBeVisible();
    await expect(overviewPage.docMarkdown.heading('Getting Started')).toBeVisible();
  });

  test.describe('Collection Configuration', () => {
    test('shows the Headers, Auth, Variables, Script and Tests groups with their values', async ({ overviewPage }) => {
      const { configuration } = overviewPage;
      await expect(overviewPage.sectionLabel('Collection Configuration')).toBeVisible();

      await test.step('the Headers group lists the collection-level header and its value', async () => {
        await expect(configuration.subHeading('Headers')).toBeVisible();
        await expect(configuration.root.getByText('collection-header-value')).toBeVisible();
      });

      await test.step('the Auth group shows the resolved auth mode (Bearer Token)', async () => {
        await expect(configuration.subHeading('Auth')).toBeVisible();
        await expect(configuration.root.getByText('Bearer Token')).toBeVisible();
      });

      await test.step('the Variables group lists the collection-level pre-request variables', async () => {
        await expect(configuration.subHeading('Variables')).toBeVisible();
        await expect(configuration.root.getByText('collection_pre_var_value', { exact: true })).toBeVisible();
        await expect(configuration.root.getByText('collection-var-value', { exact: true })).toBeVisible();
      });

      await test.step('the Script and Tests groups are present', async () => {
        await expect(configuration.subHeading('Script')).toBeVisible();
        await expect(configuration.subHeading('Tests')).toBeVisible();
      });
    });

    test('keeps the auth token masked until the reveal toggle is clicked', async ({ overviewPage }) => {
      const { secret } = overviewPage.configuration;

      await test.step('the token is shown as stars, not the raw value', async () => {
        await expect(secret.value).toContainText('*');
        await expect(secret.value).not.toHaveText('{{bearer_auth_token}}');
      });

      await test.step('clicking the reveal toggle shows the raw token', async () => {
        await secret.toggleReveal();
        await expect(secret.value).toHaveText('{{bearer_auth_token}}');
      });
    });

    test('copies a config code snippet and confirms with a "Copied" label', async ({ overviewPage, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const { configuration } = overviewPage;

      await test.step('clicking the copy button switches its label to "Copied"', async () => {
        await configuration.copyToClipboard();
        await expect(configuration.copyButton).toHaveAttribute('aria-label', 'Copied');
      });
    });
  });

  test('mobile: values truncate so the Disabled chip stays pinned in the card (no whole-table scroll)', async ({
    overviewPage,
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const { configuration } = overviewPage;

    const rows = configuration.disabledRows;
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    const card = await boundingBoxOf(configuration.root);

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const value = row.getByTestId('property-value');
      const chip = await boundingBoxOf(row.getByTestId('disabled-badge'));
      const valueBox = await boundingBoxOf(value);

      await test.step(`row ${i}: the chip sits at the end — to the right of the value`, () => {
        expect(chip.x).toBeGreaterThanOrEqual(valueBox.x + valueBox.width);
      });

      await test.step(`row ${i}: the chip stays pinned within the card, never scrolled off`, () => {
        expect(chip.x + chip.width).toBeLessThanOrEqual(card.x + card.width + 1);
      });
    }

    await test.step('the table does not scroll on mobile — the value truncates instead', async () => {
      const info = await configuration.root
        .locator('.property-table')
        .first()
        .evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
      expect(info.scrollWidth).toBeLessThanOrEqual(info.clientWidth + 1);
    });
  });

  test('desktop: every property table (single- and multi-row) scrolls as one unit when a value overflows', async ({
    overviewPage,
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const tables = overviewPage.configuration.root.locator('.property-table');
    const count = await tables.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const table = tables.nth(i);
      const rowCount = await table.locator('.property-row').count();
      await table.getByTestId('property-value').first().evaluate((el) => {
        el.textContent = 'x'.repeat(400);
      });
      const info = await table.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          overflowX: cs.overflowX,
          borderRightWidth: cs.borderRightWidth,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        };
      });
      expect(info.overflowX, `table ${i} (${rowCount} rows) overflowX`).toBe('auto');
      expect(info.scrollWidth, `table ${i} (${rowCount} rows) should scroll`).toBeGreaterThan(info.clientWidth);
      expect(info.borderRightWidth, `table ${i} (${rowCount} rows) keeps its right border`).not.toBe('0px');
    }
  });
});
