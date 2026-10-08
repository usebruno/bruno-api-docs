import { test, expect } from '../../playwright';

const GET_ALL_CUSTOMERS = ['billing', 'customers', 'Get All Customers'];

test.describe('Truncation tooltips', () => {
  test('reveals the full text in a tooltip when a value is truncated (narrow viewport)', async ({
    requestPage,
    tooltip,
    page
  }) => {
    await requestPage.open(GET_ALL_CUSTOMERS);
    await page.setViewportSize({ width: 280, height: 800 });

    const clippedCell = await tooltip.findFirstClippedCell();
    expect(clippedCell, 'expected at least one truncated cell at 280px').not.toBeNull();

    await tooltip.hoverCell(clippedCell!.index);
    await expect(tooltip.popup).toBeVisible();
    await expect(tooltip.popup).toHaveText(clippedCell!.fullText);
  });

  test('does not attach a tooltip to text that fits (wide viewport)', async ({ requestPage, tooltip, page }) => {
    await requestPage.open(GET_ALL_CUSTOMERS);
    await page.setViewportSize({ width: 1400, height: 900 });

    const unclippedCellIndex = await tooltip.findFirstUnclippedCellIndex();
    test.skip(unclippedCellIndex < 0, 'no non-truncated text found to check');

    await tooltip.hoverCell(unclippedCellIndex);
    await expect(tooltip.popup).toHaveCount(0);
  });
});

test.describe('Description tooltips', () => {
  const DESCRIBED_REQUEST = '/?fixture=descriptions#/described-request';
  const MULTI_PARAGRAPH = 'Identifies this request across every service that handles it, from the gateway to the database.\n\nSend a fresh value per call so retries can be told apart in the logs.';

  test('keeps the line breaks of a multi-paragraph description', async ({ page, tooltip }) => {
    await page.goto(DESCRIBED_REQUEST);

    await tooltip.cellWithText('Identifies this request').hover();

    await expect(tooltip.popup).toBeVisible();
    expect(await tooltip.popup.innerText()).toBe(MULTI_PARAGRAPH);
  });
});

test.describe('Tooltip theme', () => {
  test.use({ colorScheme: 'light' });

  test('uses the theme surface and text colors in light and dark mode', async ({ page, tooltip, themeToggle }) => {
    await page.goto('/?fixture=descriptions#/described-request');

    await tooltip.cellWithText('Identifies this request').hover();
    await expect(tooltip.popup).toBeVisible();
    const light = await tooltip.popupColorsAgainstTheme();
    expect(light.popup).toEqual(light.theme);

    await themeToggle.toggle();
    await tooltip.cellWithText('Identifies this request').hover();
    await expect(tooltip.popup).toBeVisible();
    const dark = await tooltip.popupColorsAgainstTheme();
    expect(dark.popup).toEqual(dark.theme);
    expect(dark.popup[0]).not.toBe(light.popup[0]);
  });
});
