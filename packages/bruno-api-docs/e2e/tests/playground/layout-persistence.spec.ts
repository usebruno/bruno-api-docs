import { test, expect } from '../../playwright';
import { DOCK_STORAGE_KEY, HEIGHT_STORAGE_KEY } from '../../../src/utils/playgroundDock';

const DESKTOP = { width: 1280, height: 900 };
const openAt = (dock: string): string => `/#/?pg=1&dock=${dock}`;
const REQUEST_PATH = ['billing', 'customers', 'Get Customers - Filter by Date Range'];

test.describe('playground layout persistence (desktop)', () => {
  test.use({ viewport: DESKTOP });

  test('restores the bottom sheet height across a reload', async ({ page, playground }) => {
    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();

    await playground.grabBottomResizer();
    await playground.movePointerToY(300);
    await playground.releasePointer();
    const resized = await playground.bottomPanelHeight();
    expect(resized).toBeGreaterThan(560);
    expect(await playground.storedItem('local', HEIGHT_STORAGE_KEY)).toBeNull();
    expect(Number(await playground.storedItem('session', HEIGHT_STORAGE_KEY))).toBeGreaterThan(560);

    await page.reload();
    await expect(playground.bottomPanel).toBeVisible();
    expect(Math.abs((await playground.bottomPanelHeight()) - resized)).toBeLessThan(5);
  });

  test('restores the inline panel width across a reload', async ({ page, playground }) => {
    await playground.open('inline');
    await expect(playground.inlinePanel).toBeVisible();

    await playground.grabInlineResizer();
    await playground.movePointerToX(500);
    await playground.releasePointer();
    const resized = await playground.inlinePanelWidth();
    expect(resized).toBeGreaterThan(700);

    await page.reload();
    await expect(playground.inlinePanel).toBeVisible();
    expect(Math.abs((await playground.inlinePanelWidth()) - resized)).toBeLessThan(5);
  });

  test('reopens in the last-used dock after closing (fresh open, no dock in URL)', async ({
    requestPage,
    playground
  }) => {
    await requestPage.open(REQUEST_PATH);
    await requestPage.urlBar.tryButton.click();
    await expect(playground.bottomPanel).toBeVisible();

    await playground.selectDock('inline');
    await expect(playground.inlinePanel).toBeVisible();
    expect(await playground.storedItem('session', DOCK_STORAGE_KEY)).toBe('inline');
    expect(await playground.storedItem('local', DOCK_STORAGE_KEY)).toBeNull();

    await playground.close();
    await expect(playground.header).toHaveCount(0);

    await requestPage.urlBar.tryButton.click();
    await expect(playground.inlinePanel).toBeVisible();
    await expect(playground.bottomPanel).toHaveCount(0);
  });

  test('a dock in the URL wins over the stored dock', async ({ page, playground }) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, 'inline');
    }, DOCK_STORAGE_KEY);

    await page.goto(openAt('modal'));
    await expect(playground.modalPanel).toBeVisible();
    await expect(playground.inlinePanel).toHaveCount(0);
  });

  test('an invalid stored dock falls back to the default on a fresh open', async ({
    page,
    requestPage,
    playground
  }) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, 'sideways');
    }, DOCK_STORAGE_KEY);

    await requestPage.open(REQUEST_PATH);
    await requestPage.urlBar.tryButton.click();
    await expect(playground.bottomPanel).toBeVisible();
  });

  test('a collapsed bottom sheet stays collapsed after a reload', async ({ page, playground }) => {
    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();

    await playground.grabBottomResizer();
    await playground.movePointerToY(890);
    await playground.releasePointer();
    expect(await playground.bottomPanelHeight()).toBeLessThan(100);

    await page.reload();
    await expect(playground.bottomPanel).toBeVisible();
    expect(await playground.bottomPanelHeight()).toBeLessThan(100);
  });

  test('expanding after a collapsed reload restores the pre-collapse height', async ({ page, playground }) => {
    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();

    await playground.grabBottomResizer();
    await playground.movePointerToY(300);
    await playground.releasePointer();
    const resized = await playground.bottomPanelHeight();
    expect(resized).toBeGreaterThan(560);

    await playground.grabBottomResizer();
    await playground.movePointerToY(890);
    await playground.releasePointer();
    expect(await playground.bottomPanelHeight()).toBeLessThan(100);

    await page.reload();
    await expect(playground.bottomPanel).toBeVisible();
    expect(await playground.bottomPanelHeight()).toBeLessThan(100);

    await playground.toggleCollapse();
    expect(Math.abs((await playground.bottomPanelHeight()) - resized)).toBeLessThan(5);
  });

  test('Try it after collapsing expands to the persisted height', async ({ requestPage, playground }) => {
    await requestPage.open(REQUEST_PATH);
    await requestPage.urlBar.tryButton.click();
    await expect(playground.bottomPanel).toBeVisible();

    await playground.grabBottomResizer();
    await playground.movePointerToY(200);
    await playground.releasePointer();
    const resized = await playground.bottomPanelHeight();
    expect(resized).toBeGreaterThan(650);

    await playground.toggleCollapse();
    expect(await playground.bottomPanelHeight()).toBeLessThan(100);

    await requestPage.urlBar.tryButton.click();
    await expect(playground.content).toBeVisible();
    expect(Math.abs((await playground.bottomPanelHeight()) - resized)).toBeLessThan(5);
  });

  test('keeps the bottom height after the inline width is resized', async ({ page, playground }) => {
    await playground.open('bottom');
    await playground.grabBottomResizer();
    await playground.movePointerToY(300);
    await playground.releasePointer();
    const height = await playground.bottomPanelHeight();
    expect(height).toBeGreaterThan(560);

    await playground.selectDock('inline');
    await playground.grabInlineResizer();
    await playground.movePointerToX(500);
    await playground.releasePointer();
    const width = await playground.inlinePanelWidth();
    expect(width).toBeGreaterThan(700);

    await playground.selectDock('bottom');
    expect(Math.abs((await playground.bottomPanelHeight()) - height)).toBeLessThan(5);

    await page.reload();
    await expect(playground.bottomPanel).toBeVisible();
    expect(Math.abs((await playground.bottomPanelHeight()) - height)).toBeLessThan(5);

    await playground.selectDock('inline');
    expect(Math.abs((await playground.inlinePanelWidth()) - width)).toBeLessThan(5);
  });

  test('opens at the default bottom height when nothing is stored', async ({ playground }) => {
    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();
    const height = await playground.bottomPanelHeight();
    expect(height).toBeGreaterThan(520);
    expect(height).toBeLessThanOrEqual(560);
  });

  test('opens at the default inline width when nothing is stored', async ({ playground }) => {
    await playground.open('inline');
    await expect(playground.inlinePanel).toBeVisible();
    const width = await playground.inlinePanelWidth();
    expect(width).toBeGreaterThan(490);
    expect(width).toBeLessThanOrEqual(540);
  });

  test('ignores a corrupt stored height and uses the default', async ({ page, playground }) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, 'not-a-number');
    }, HEIGHT_STORAGE_KEY);

    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();
    const height = await playground.bottomPanelHeight();
    expect(height).toBeGreaterThan(520);
    expect(height).toBeLessThanOrEqual(560);
  });

  test('clamps an out-of-range stored height to the viewport', async ({ page, playground }) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, '99999');
    }, HEIGHT_STORAGE_KEY);

    await playground.open('bottom');
    await expect(playground.bottomPanel).toBeVisible();
    const height = await playground.bottomPanelHeight();
    expect(height).toBeGreaterThan(850);
    expect(height).toBeLessThanOrEqual(900);
  });

  test('a fresh Try it with no stored dock opens in the bottom dock', async ({ requestPage, playground }) => {
    await requestPage.open(REQUEST_PATH);
    await requestPage.urlBar.tryButton.click();
    await expect(playground.bottomPanel).toBeVisible();
    await expect(playground.inlinePanel).toHaveCount(0);
    await expect(playground.modalPanel).toHaveCount(0);
  });
});
