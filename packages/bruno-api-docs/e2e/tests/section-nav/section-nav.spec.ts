import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';

const REQUEST_WITH_CONFIG = ['billing', 'customers', 'Get Customers - Filter by Date Range'];
const REQUEST_WITH_EXEC = ['billing', 'customers', 'Get All Customers'];

const firstLabel = (page: Page) =>
  page.getByTestId('section-nav-rail').locator('.section-nav-item-text').first();

const openOutline = async (page: Page): Promise<void> => {
  await page.getByTestId('section-nav-rail').getByRole('button').first().focus();
  await expect(firstLabel(page)).toBeVisible();
};

const outlineRow = (page: Page, label: string) =>
  page.getByTestId('section-nav-rail').getByRole('button', { name: label, exact: true });

test.describe('Section navigator (the "on this page" outline)', () => {
  test('opening it lists the sections on the page', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toBeVisible();
    // Collapsed: the labels are hidden (zero width), only the ticks show.
    await expect(firstLabel(page)).toBeHidden();

    // Focusing a rail marker opens the labelled outline (the keyboard path; deterministic in tests).
    await openOutline(page);

    // The page title is always the first entry; the rest are the rendered sections.
    await expect(rail.getByRole('button').first()).toHaveText('Realtime');
    await expect(rail).toContainText('Folder Configuration');
    await expect(rail).toContainText('Headers');
  });

  test('clicking a section scrolls to it and marks it as current', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    await openOutline(page);
    await outlineRow(page, 'Headers').click();

    await expect
      .poll(async () => {
        const box = await page.getByTestId('folder-config-headers').boundingBox();
        return box ? Math.round(box.y) : Number.MAX_SAFE_INTEGER;
      })
      .toBeLessThan(240);
    await expect(outlineRow(page, 'Headers')).toHaveAttribute('aria-current', 'location');
  });

  test('opening expands the rail leftward into a labelled card, keeping its right edge', async ({
    folderPage,
    page
  }) => {
    await folderPage.open(['Realtime']);

    const rail = page.getByTestId('section-nav-rail');
    const collapsed = await rail.boundingBox();
    await openOutline(page);
    const opened = await rail.boundingBox();
    if (!collapsed || !opened) throw new Error('expected the rail to be laid out');

    expect(opened.width).toBeGreaterThan(collapsed.width);
    expect(opened.x).toBeLessThan(collapsed.x);
    expect(Math.abs(opened.x + opened.width - (collapsed.x + collapsed.width))).toBeLessThan(24);
  });

  test('pressing Escape closes the outline', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    await openOutline(page);
    await page.keyboard.press('Escape');
    // The labels collapse back to zero width.
    await expect(firstLabel(page)).toBeHidden();
  });

  test('on a request, groups Params/Auth under a "Configuration" heading and leaves out the code snippet', async ({
    requestPage,
    page
  }) => {
    await requestPage.open(REQUEST_WITH_CONFIG);
    // Code Snippet is on the page but opts out of the navigator.
    await expect(page.getByTestId('request-section-code-snippet')).toBeVisible();

    await openOutline(page);

    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toContainText('Configuration');
    await expect(outlineRow(page, 'Params')).toBeVisible();
    await expect(outlineRow(page, 'Auth')).toBeVisible();
    await expect(rail).not.toContainText('Code Snippet');
  });

  test('clicking the "Configuration" group jumps to its first section', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_CONFIG);

    await openOutline(page);
    await outlineRow(page, 'Configuration').click();

    await expect
      .poll(async () => {
        const box = await page.getByTestId('request-section-params').boundingBox();
        return box ? Math.round(box.y) : Number.MAX_SAFE_INTEGER;
      })
      .toBeLessThan(260);
  });

  test('highlighting a section never also highlights its "Configuration" group', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_CONFIG);

    // Clicking a member marks only that member current — never the group as well.
    await openOutline(page);
    await outlineRow(page, 'Params').click();
    await expect(outlineRow(page, 'Params')).toHaveAttribute('aria-current', 'location');
    await expect(outlineRow(page, 'Configuration')).not.toHaveAttribute('aria-current');
  });

  test('shows the Execution Context tabs as entries nested under it', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    await openOutline(page);

    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toContainText('Execution Context');
    for (const tab of ['Variables', 'Scripts', 'Asserts', 'Tests']) {
      await expect(outlineRow(page, tab)).toBeVisible();
    }
  });

  test('clicking a tab entry opens a collapsed Execution Context and switches to that tab', async ({
    requestPage,
    page
  }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    // Collapse the Execution Context first (its toggle is inside the section, not the rail).
    const ecSection = page.getByTestId('request-section-execution-context');
    const ecToggle = ecSection.getByRole('button', { name: /Execution Context/ });
    await ecToggle.click();
    await expect(ecToggle).toHaveAttribute('aria-expanded', 'false');

    // Clicking the Asserts entry should re-open the section and select the Asserts tab.
    await openOutline(page);
    await outlineRow(page, 'Asserts').click();

    await expect(ecToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(requestPage.executionContext.tab('asserts')).toHaveAttribute('aria-selected', 'true');
    await expect(requestPage.executionContext.tab('variables')).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking the Execution Context entry re-opens it when collapsed', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    const ecSection = page.getByTestId('request-section-execution-context');
    const ecToggle = ecSection.getByRole('button', { name: /Execution Context/ });
    await ecToggle.click();
    await expect(ecToggle).toHaveAttribute('aria-expanded', 'false');

    await openOutline(page);
    await outlineRow(page, 'Execution Context').click();
    await expect(ecToggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('is not shown when there is nothing to navigate but the title (a script page)', async ({
    scriptPage,
    page
  }) => {
    await scriptPage.open(['billing', 'Script.js']);
    // A script page has no sub-sections or headings, so the rail stays hidden.
    await expect(page.getByTestId('section-nav-rail')).toBeHidden();
  });

  test('appears on an unsupported-request page that has documentation headings', async ({
    unsupportedRequestPage,
    page
  }) => {
    await unsupportedRequestPage.open(['Realtime', 'Live Updates']);
    await expect(page.getByTestId('section-nav-rail')).toBeVisible();
  });

  test('lists the headings written in the overview\'s documentation', async ({ overviewPage, page }) => {
    await overviewPage.goto('/');

    await openOutline(page);

    // The collection docs' `## Getting Started / ## Authentication / ## Rate Limits` become entries.
    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toContainText('Getting Started');
    await expect(rail).toContainText('Authentication');
    await expect(rail).toContainText('Rate Limits');
  });

  test('clicking a documentation heading opens its "view more" block and scrolls to it', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    await openOutline(page);
    await outlineRow(page, 'Query Parameters').click();

    // The description's own heading (revealed if the "view more" block was collapsed) lands near the top.
    await expect
      .poll(async () => {
        const box = await page.getByRole('heading', { name: 'Query Parameters', exact: true }).boundingBox();
        return box ? Math.round(box.y) : Number.MAX_SAFE_INTEGER;
      })
      .toBeLessThan(280);
  });

  test('stays visible but clips above a bottom-docked playground (no overlap)', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);
    await expect(page.getByTestId('section-nav-rail')).toBeVisible();

    // The bottom dock splits the screen, so the rail stays but is capped to the docs area's height.
    await page.getByTestId('request-try-button').click();
    await expect(page.getByTestId('playground-content')).toBeVisible();

    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toBeVisible();

    // Its bottom edge sits above the playground panel — it never draws over it.
    const railBox = await rail.boundingBox();
    const playgroundBox = await page.getByTestId('playground-content').boundingBox();
    expect(railBox).not.toBeNull();
    expect(playgroundBox).not.toBeNull();
    expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(playgroundBox!.y);
  });

  test('hides entirely when a bottom-docked playground leaves too little height', async ({ requestPage, page }) => {
    await page.setViewportSize({ width: 1280, height: 250 });
    await requestPage.open(REQUEST_WITH_EXEC);
    await expect(page.getByTestId('section-nav-rail')).toBeVisible();

    // The bottom dock opens to 60% of the viewport, leaving the docs column too short for the rail.
    await page.getByTestId('request-try-button').click();
    await expect(page.getByTestId('playground-content')).toBeVisible();
    await expect(page.getByTestId('section-nav-rail')).toBeHidden();
  });

  test('sits at the docs column edge when the playground is docked to the side, with room', async ({
    requestPage,
    page
  }) => {
    // Wide enough that the docs column keeps its full padding once the playground takes the right.
    await page.setViewportSize({ width: 1920, height: 900 });
    await requestPage.open(REQUEST_WITH_EXEC);
    await page.getByTestId('request-try-button').click();
    await expect(page.getByTestId('playground-runner')).toBeVisible();
    await page.getByTestId('playground-dock-inline').click();

    const rail = page.getByTestId('section-nav-rail');
    await expect(rail).toBeVisible();
    // It hangs off the docs column's right edge (the playground fills the right side), so its right
    // edge sits well left of the viewport's — not pinned to the viewport edge.
    const railBox = await rail.boundingBox();
    expect(railBox).not.toBeNull();
    expect(railBox!.x + railBox!.width).toBeLessThan(1920 - 100);
  });

  test('hides when the inline dock squeezes the docs column too narrow', async ({ requestPage, page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await requestPage.open(REQUEST_WITH_EXEC);
    await page.getByTestId('request-try-button').click();
    await expect(page.getByTestId('playground-runner')).toBeVisible();

    // Inline dock at this width leaves the docs column below its padding breakpoint, so rather
    // than overlap the content the rail hides.
    await page.getByTestId('playground-dock-inline').click();
    await expect(page.getByTestId('section-nav-rail')).toBeHidden();
  });

  test('is hidden on small (mobile) screens', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);
    await expect(page.getByTestId('section-nav-rail')).toBeVisible();

    await page.setViewportSize({ width: 600, height: 900 });
    await expect(page.getByTestId('section-nav-rail')).toBeHidden();
  });
});
