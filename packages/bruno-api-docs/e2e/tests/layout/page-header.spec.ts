import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PageHeaderComponent } from '../../components/layout/page-header.component';

/**
 * The page header (sticky top navigation bar): brand cluster, Open-in-Bruno
 * CTA and theme toggle.
 */
test.use({ colorScheme: 'light' });

const DESKTOP = { width: 1280, height: 900 };
const TABLET = { width: 900, height: 800 };
const MOBILE = { width: 390, height: 800 };

const GENERAL = '/?fixture=general';
const NO_ENV = '/?fixture=general-none';
const ONE_ENV = '/?fixture=general-one';
const LONG_NAME = '/?fixture=general-long';
const NO_VERSION = '/?fixture=general-noversion';

const COLLECTION_NAME = 'Northwind Partner Integration Collection for External Settlement and Reconciliation Services';

type Box = { x: number; y: number; width: number; height: number };

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('control has no bounding box');
  return box;
};

const overlaps = (a: Box, b: Box) => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 1 && height > 1;
};

const expectNoOverlap = async (controls: Locator[]) => {
  const boxes = await Promise.all(controls.map(boxOf));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(overlaps(boxes[i], boxes[j])).toBe(false);
    }
  }
};

const expectHeaderStaysPinned = async (page: Page, pageHeader: PageHeaderComponent, moving: Locator) => {
  const main = page.getByRole('main');
  await expect(moving.evaluate((el) => el.closest('main') != null)).resolves.toBe(true);

  await main.evaluate((el) => {
    el.scrollTop = 0;
  });

  const markerBefore = await moving.evaluate((el) => el.getBoundingClientRect().top);
  const headerBefore = await pageHeader.root.evaluate((el) => el.getBoundingClientRect().top);

  const scrolled = await main.evaluate((el) => {
    const before = el.scrollTop;
    el.scrollTop = el.scrollHeight;
    return el.scrollTop - before;
  });
  expect(scrolled).toBeGreaterThan(20);

  await expect.poll(() => moving.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(markerBefore - 20);

  const headerAfter = await pageHeader.root.evaluate((el) => el.getBoundingClientRect().top);
  expect(headerBefore).toBeLessThanOrEqual(1);
  expect(Math.abs(headerAfter - headerBefore)).toBeLessThanOrEqual(1);

  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector('[data-testid="topbar"]');
    const scroller = document.querySelector('main');
    const shell = header?.closest('[data-testid="app-shell"]');
    const column = header?.parentElement;
    if (!header || !scroller || !shell || !column) return null;
    const shellHeight = Number.parseFloat(getComputedStyle(shell).height);
    return {
      headerInsideMain: scroller.contains(header),
      mainOverflowY: getComputedStyle(scroller).overflowY,
      columnOverflowY: getComputedStyle(column).overflowY,
      shellFillsViewport: Math.abs(shellHeight - window.innerHeight) <= 1
    };
  })).toEqual({
    headerInsideMain: false,
    mainOverflowY: 'auto',
    columnOverflowY: 'hidden',
    shellFillsViewport: true
  });
};

test.describe('Page header', () => {
  test('shows brand (name + version) and a pinned bar', async ({ page, pageHeader, overviewPage }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    await expect(pageHeader.root).toBeVisible();
    await expect(pageHeader.brandName).toContainText('Bruno Testbench');
    await expect(pageHeader.brandVersion).toHaveText('Version : 1.0.0');

    // Sticky: header stays at the top after the page scrolls.
    await expectHeaderStaysPinned(page, pageHeader, overviewPage.root);
  });

  test('shows the initials avatar derived from the collection name', async ({ page, pageHeader }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    // sampleCollection name is "Bruno Testbench" → "BT".
    await expect(pageHeader.brandInitials).toBeVisible();
    await expect(pageHeader.brandInitials).toHaveText('BT');
  });

  test('shows the theme toggle in the header', async ({ page, themeToggle }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    await expect(themeToggle.button).toBeVisible();
  });

  test('shows the Open-in-Bruno CTA linking to Fetch-in-Bruno when the collection has a git url', async ({ page, pageHeader }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    await expect(pageHeader.openInBruno).toBeVisible();
    const href = await pageHeader.openInBruno.getAttribute('href');
    expect(href).toMatch(/^https:\/\/fetch\.usebruno\.com\?url=/);
    expect(await pageHeader.openInBruno.getAttribute('target')).toBe('_blank');
    expect(await pageHeader.openInBruno.getAttribute('rel')).toContain('noopener');
  });

  test('shows search, Show vars, and the environment dropdown', async ({ page, search, envSwitcher }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    await expect(search.field).toBeVisible();
    await expect(envSwitcher.showVarsToggle).toBeVisible();
    await expect(envSwitcher.trigger).toBeVisible();
  });

  test('mobile condenses: hamburger shows, Open-in-Bruno becomes a glyph, brand compact', async ({ page, pageHeader }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');

    // Below desktop the sidebar trigger appears.
    await expect(pageHeader.menuButton).toBeVisible();
    // Open-in-Bruno condenses to the Bruno glyph below the desktop layout (the
    // capability gate still hides it on real touch devices; this browser is
    // pointer-capable, so the glyph shows). No full "Open in Bruno" label.
    await expect(pageHeader.openInBruno).toBeVisible();
    await expect(pageHeader.openInBruno).toHaveClass(/is-icon/);

    // Compact brand: avatar + "Docs" only — no full name, no version.
    await expect(pageHeader.brandName).toHaveText('Docs');
    await expect(pageHeader.brandVersion).toHaveCount(0);
    await expect(pageHeader.root).not.toContainText('Bruno Testbench');

    // No horizontal overflow.
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(MOBILE.width + 1);
  });
});

test.describe('Header behavior', () => {
  test.use({ viewport: DESKTOP });

  test('keeps the header controls visible without overlap', async ({
    page,
    pageHeader,
    search,
    envSwitcher,
    themeToggle
  }) => {
    await page.goto('/');

    const controls = [
      pageHeader.brand,
      search.field,
      envSwitcher.showVarsToggle,
      envSwitcher.trigger,
      themeToggle.button,
      pageHeader.openInBruno
    ];
    for (const control of controls) await expect(control).toBeVisible();
    await expectNoOverlap(controls);

    await envSwitcher.open();
    await expect(envSwitcher.menu).toBeVisible();
    await page.keyboard.press('Escape');
    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
  });

  test('stays pinned while Overview, a request, and Environments scroll', async ({
    page,
    pageHeader,
    sidebar,
    requestPage,
    environmentsPage,
    overviewPage
  }) => {
    await page.goto('/');
    await expect(overviewPage.root).toBeVisible();
    await expectHeaderStaysPinned(page, pageHeader, overviewPage.root);

    await sidebar.item('get users').click();
    await expect(requestPage.title).toHaveText('get users');
    await expectHeaderStaysPinned(page, pageHeader, requestPage.title);

    await sidebar.environments.click();
    await expect(environmentsPage.root).toBeVisible();
    await expectHeaderStaysPinned(page, pageHeader, environmentsPage.root);
  });

  test('lists only the included environments, with the first one selected', async ({ page, envSwitcher }) => {
    await page.goto(GENERAL);

    await expect(envSwitcher.trigger).toContainText('Dev');
    await envSwitcher.open();
    await expect(envSwitcher.menu.getByRole('menuitem')).toHaveCount(2);
    await expect(envSwitcher.option('Dev')).toBeVisible();
    await expect(envSwitcher.option('Prod')).toBeVisible();
    await expect(envSwitcher.option('Dev')).toHaveAttribute('aria-current', 'true');
  });

  test('selecting an environment updates the label', async ({ page, envSwitcher }) => {
    await page.goto(GENERAL);

    await envSwitcher.selectEnvironment('Prod');

    await expect(envSwitcher.trigger).toContainText('Prod');
    await expect(envSwitcher.trigger).not.toContainText('Dev');
  });

  test('keeps the label in sync across a couple of environment switches', async ({ page, envSwitcher }) => {
    await page.goto(GENERAL);
    await expect(envSwitcher.trigger).toContainText('Dev');

    await envSwitcher.selectEnvironment('Prod');
    await expect(envSwitcher.trigger).toContainText('Prod');
    await envSwitcher.selectEnvironment('Dev');
    await expect(envSwitcher.trigger).toContainText('Dev');
    await envSwitcher.selectEnvironment('Prod');
    await expect(envSwitcher.trigger).toContainText('Prod');
  });

  test('remembers Show vars and the selected environment after refresh and navigation', async ({
    page,
    sidebar,
    requestPage,
    envSwitcher
  }) => {
    await page.goto(GENERAL);
    await sidebar.item('Alpha').click();
    await expect(requestPage.title).toHaveText('Alpha');

    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'false');
    await expect(envSwitcher.trigger).toContainText('Dev');

    await envSwitcher.selectEnvironment('Prod');
    await envSwitcher.toggle();
    await expect(envSwitcher.trigger).toContainText('Prod');
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(requestPage.title).toHaveText('Alpha');
    await expect(envSwitcher.trigger).toContainText('Prod');
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');

    await sidebar.item('Beta').click();
    await expect(requestPage.title).toHaveText('Beta');
    await expect(envSwitcher.trigger).toContainText('Prod');
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
  });

  test('shows a single environment in the dropdown', async ({ page, envSwitcher }) => {
    await page.goto(ONE_ENV);

    await expect(envSwitcher.trigger).toContainText('Staging');
    await envSwitcher.open();
    await expect(envSwitcher.menu.getByRole('menuitem')).toHaveCount(1);
    await expect(envSwitcher.option('Staging')).toBeVisible();
  });

  test('shows No environments in the dropdown when none are included', async ({ page, envSwitcher }) => {
    await page.goto(NO_ENV);

    await expect(envSwitcher.trigger).toContainText('No environments');
    await envSwitcher.open();
    await expect(envSwitcher.emptyOption).toContainText('No environments');
  });

  test('truncates a very long collection name without covering the other controls', async ({
    page,
    pageHeader,
    search,
    envSwitcher,
    themeToggle
  }) => {
    await page.setViewportSize(TABLET);
    await page.goto(LONG_NAME);

    await expect(pageHeader.menuButton).toBeVisible();
    await expect(search.toggleIcon).toBeVisible();
    await expect(pageHeader.brandInitials).toBeVisible();
    await expect(pageHeader.brandName).toHaveText(COLLECTION_NAME);
    await expect(pageHeader.brandVersion).toHaveText('Version : 9.9.9');

    const truncated = await pageHeader.brandName.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(truncated).toBe(true);

    await expectNoOverlap([
      pageHeader.menuButton,
      pageHeader.brand,
      search.toggleIcon,
      envSwitcher.showVarsToggle,
      envSwitcher.trigger,
      themeToggle.button,
      pageHeader.openInBruno
    ]);
  });

  test('hides the version in the bar and on Overview when the collection has none', async ({ page, pageHeader, overviewPage }) => {
    await page.goto(NO_VERSION);

    await expect(pageHeader.brandName).toHaveText('Versionless API');
    await expect(pageHeader.brandVersion).toHaveCount(0);
    await expect(overviewPage.header.collectionName).toHaveText('Versionless API');
    await expect(overviewPage.header.collectionVersion).toHaveCount(0);
  });
});
