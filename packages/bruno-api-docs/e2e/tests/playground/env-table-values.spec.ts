import { test, expect } from '../../playwright';

test.describe('Environment variables: value cells (table view)', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openEnvironments();
    await expect(playground.keyValueTable.root).toBeVisible();
  });

  test('a long multi-line value grows its cell to fit instead of scrolling inside it', async ({ playground }) => {
    const valueInput = playground.keyValueTable.valueInputs.first();
    const oneLineHeight = (await valueInput.boundingBox())!.height;

    const lines = Array.from({ length: 16 }, (_, i) => `line ${i + 1}`);
    await valueInput.fill(lines.join('\n'));

    await expect.poll(async () => (await valueInput.boundingBox())!.height).toBeGreaterThan(oneLineHeight * 4);
    await expect.poll(() => valueInput.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(false);
  });

  test('a wrapped value re-fits its cell after the value column is dragged narrower', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    const valueInput = keyValueTable.valueInputs.first();
    await valueInput.fill('word '.repeat(60).trim());
    await expect.poll(() => valueInput.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(false);
    const widthBefore = await valueInput.evaluate((el) => el.clientWidth);

    const handle = keyValueTable.resizeHandles.first();
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => valueInput.evaluate((el) => el.clientWidth)).toBeLessThan(widthBefore - 50);
    await expect.poll(() => valueInput.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(false);
  });
});
