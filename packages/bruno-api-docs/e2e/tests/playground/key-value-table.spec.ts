import { test, expect } from '../../playwright';

const textStart = (el: HTMLElement) =>
  el.getBoundingClientRect().left
  + parseFloat(getComputedStyle(el).borderLeftWidth)
  + parseFloat(getComputedStyle(el).paddingLeft);

test.describe('KeyValueTable: cells and layout', () => {
  test.beforeEach(async ({ page, playground }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await playground.selectTab('headers');
    await expect(playground.keyValueTable.root).toBeVisible();
  });

  test('a typed cell carries a native title tooltip with its full value', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    const nameInput = keyValueTable.nameInputs.first();
    await nameInput.click();
    await page.keyboard.type('-A-Very-Long-Custom-Header-Name-That-Truncates');
    // The full value is exposed as a native title tooltip so a truncated cell stays readable.
    const value = await nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
    await expect(nameInput).toHaveAttribute('title', value);
  });

  test('the first column header lines up with the name text in the rows below it', async ({ playground }) => {
    const { keyValueTable } = playground;
    const headerStart = await keyValueTable.nameHeader.evaluate(textStart);
    const cellStart = await keyValueTable.nameInputs.first().evaluate(textStart);
    expect(Math.abs(headerStart - cellStart)).toBeLessThan(0.5);
  });

  test('a one-line description cell is exactly as tall as the name cell beside it', async ({ playground }) => {
    const { keyValueTable } = playground;
    const nameHeight = (await keyValueTable.nameInputs.first().boundingBox())!.height;
    const descriptionHeight = (await keyValueTable.descriptionInputs.first().boundingBox())!.height;
    expect(Math.abs(descriptionHeight - nameHeight)).toBeLessThan(0.5);
  });

  test('a read-only path-param key lines up with its header and matches the value cell height', async ({ playground }) => {
    await playground.openSidebarItem('Jokes');
    await playground.selectTab('params');
    const { pathParams } = playground;
    await expect(pathParams.nameTexts.first()).toHaveText('postId');

    const headerStart = await pathParams.nameHeader.evaluate(textStart);
    const keyStart = await pathParams.nameTexts.first().evaluate(textStart);
    expect(Math.abs(headerStart - keyStart)).toBeLessThan(0.5);

    const keyHeight = (await pathParams.nameTexts.first().boundingBox())!.height;
    const valueHeight = (await pathParams.valueInputs.first().boundingBox())!.height;
    expect(Math.abs(keyHeight - valueHeight)).toBeLessThan(0.5);
  });

  test('the query params table labels its first column Name, like the app', async ({ playground }) => {
    await playground.selectTab('params');
    await expect(playground.keyValueTable.nameHeader).toHaveText('Name');
  });

  test('the table has a min-width and a horizontally-scrollable container', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    await expect(keyValueTable.container).toHaveCSS('overflow-x', 'auto');
    await expect(keyValueTable.table).toHaveCSS('min-width', '448px');

    await page.setViewportSize({ width: 360, height: 800 });
    const overflows = await keyValueTable.container.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflows).toBe(true);
  });

  test('offers {{variable}} autocomplete in the value cell but not the name cell', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    await keyValueTable.valueInputs.last().click();
    await page.keyboard.type('{{coll');
    await expect(keyValueTable.autocomplete).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(keyValueTable.autocomplete).toHaveCount(0);

    await keyValueTable.nameInputs.last().click();
    await page.keyboard.type('{{coll');
    await page.waitForTimeout(250);
    await expect(keyValueTable.autocomplete).toHaveCount(0);
  });

  test('the header-name suggestions list scrolls with the thin themed scrollbar', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    await keyValueTable.nameInputs.last().click();
    await page.keyboard.type('Content');
    await expect(keyValueTable.autocomplete).toBeVisible();
    await expect(keyValueTable.autocomplete).toHaveCSS('scrollbar-width', 'thin');
  });

  test('flags a header name that contains a space with an inline error', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    await keyValueTable.nameInputs.last().click();
    await page.keyboard.type('Bad Name');
    const error = keyValueTable.cellErrors.first();
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('aria-label', 'Header name cannot contain spaces or newlines');
  });

  test('a named row can be enabled and disabled via its checkbox', async ({ playground }) => {
    const { keyValueTable } = playground;
    await keyValueTable.nameInputs.last().fill('X-Custom');

    const toggle = keyValueTable.enableToggle('X-Custom');
    await expect(toggle).toBeChecked();

    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();

    await toggle.check();
    await expect(toggle).toBeChecked();
  });

  test('columns are resizable by dragging a header divider', async ({ page, playground }) => {
    const { keyValueTable } = playground;
    const valueHeader = keyValueTable.columnHeader('col-value');
    const before = (await valueHeader.boundingBox())!.width;

    const handle = keyValueTable.resizeHandles.first();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => (await valueHeader.boundingBox())!.width).toBeLessThan(before - 30);
  });
});
