import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';

const REQUEST_WITH_CONFIG = ['billing', 'customers', 'Get Customers - Filter by Date Range'];
const REQUEST_WITH_EXEC = ['billing', 'customers', 'Get All Customers'];

const openPopup = async (page: Page): Promise<void> => {
  await page.getByTestId('section-nav-rail').getByRole('button').first().focus();
  await expect(page.getByTestId('section-nav-panel')).toBeVisible();
};
const popupRow = (page: Page, label: string) =>
  page.getByTestId('section-nav-panel').getByTestId('section-nav-item').filter({ hasText: new RegExp(`^${label}$`) });

const railTick = (page: Page, label: string) =>
  page.getByTestId('section-nav-rail').getByRole('button', { name: label, exact: true });

test.describe('Section navigator (the "on this page" outline)', () => {
  test('opening it lists the sections on the page', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    const rail = page.getByTestId('section-nav-rail');
    const panel = page.getByTestId('section-nav-panel');
    await expect(rail).toBeVisible();
    await expect(panel).toBeHidden();

    // Focusing a rail marker reveals the labelled popup (the keyboard path; deterministic in tests).
    await rail.getByRole('button').first().focus();
    await expect(panel).toBeVisible();

    // The page title is always the first entry; the rest are the rendered sections.
    await expect(page.getByTestId('section-nav-item').first()).toHaveText('Realtime');
    await expect(panel).toContainText('Folder Configuration');
    await expect(panel).toContainText('Headers');
  });

  test('clicking a section scrolls to it and marks it as current', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    await openPopup(page);
    await popupRow(page, 'Headers').click();

    await expect
      .poll(async () => {
        const box = await page.getByTestId('folder-config-headers').boundingBox();
        return box ? Math.round(box.y) : Number.MAX_SAFE_INTEGER;
      })
      .toBeLessThan(240);
    await expect(railTick(page, 'Headers')).toHaveAttribute('aria-current', 'location');
  });

  test('the popup opens over the rail, hiding the ticks behind it', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);

    const railBox = await page.getByTestId('section-nav-rail').boundingBox();
    await openPopup(page);
    const panelBox = await page.getByTestId('section-nav-panel').boundingBox();
    if (!railBox || !panelBox) throw new Error('expected the rail and panel to be laid out');
    // The panel sits over the rail (overlapping it) and extends far left to show the labels.
    expect(panelBox.x).toBeLessThan(railBox.x);
    expect(panelBox.x + panelBox.width).toBeGreaterThan(railBox.x);
    await expect(page.getByTestId('section-nav-rail')).toHaveCSS('opacity', '0');
  });

  test('pressing Escape closes the popup', async ({ folderPage, page }) => {
    await folderPage.open(['Realtime']);
    const rail = page.getByTestId('section-nav-rail');
    const panel = page.getByTestId('section-nav-panel');

    await rail.getByRole('button').first().focus();
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('on a request, groups Params/Auth under a "Configuration" heading and leaves out the code snippet', async ({
    requestPage,
    page
  }) => {
    await requestPage.open(REQUEST_WITH_CONFIG);
    // Code Snippet is on the page but opts out of the navigator.
    await expect(page.getByTestId('request-section-code-snippet')).toBeVisible();

    const rail = page.getByTestId('section-nav-rail');
    const panel = page.getByTestId('section-nav-panel');
    await rail.getByRole('button').first().focus();
    await expect(panel).toBeVisible();

    await expect(panel).toContainText('Configuration');
    await expect(panel.getByTestId('section-nav-item').filter({ hasText: /^Params$/ })).toBeVisible();
    await expect(panel.getByTestId('section-nav-item').filter({ hasText: /^Auth$/ })).toBeVisible();
    await expect(panel).not.toContainText('Code Snippet');
  });

  test('clicking the "Configuration" group jumps to its first section', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_CONFIG);

    await openPopup(page);
    await popupRow(page, 'Configuration').click();

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
    await openPopup(page);
    await popupRow(page, 'Params').click();
    await expect(railTick(page, 'Params')).toHaveAttribute('aria-current', 'location');
    await expect(railTick(page, 'Configuration')).not.toHaveAttribute('aria-current');
  });

  test('shows the Execution Context tabs as entries nested under it', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    const rail = page.getByTestId('section-nav-rail');
    const panel = page.getByTestId('section-nav-panel');
    await rail.getByRole('button').first().focus();
    await expect(panel).toBeVisible();

    await expect(panel).toContainText('Execution Context');
    for (const tab of ['Variables', 'Scripts', 'Asserts', 'Tests']) {
      await expect(panel.getByTestId('section-nav-item').filter({ hasText: new RegExp(`^${tab}$`) })).toBeVisible();
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
    await openPopup(page);
    await popupRow(page, 'Asserts').click();

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

    await openPopup(page);
    await popupRow(page, 'Execution Context').click();
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

    const rail = page.getByTestId('section-nav-rail');
    const panel = page.getByTestId('section-nav-panel');
    await rail.getByRole('button').first().focus();
    await expect(panel).toBeVisible();

    // The collection docs' `## Getting Started / ## Authentication / ## Rate Limits` become entries.
    await expect(panel).toContainText('Getting Started');
    await expect(panel).toContainText('Authentication');
    await expect(panel).toContainText('Rate Limits');
  });

  test('clicking a documentation heading opens its "view more" block and scrolls to it', async ({ requestPage, page }) => {
    await requestPage.open(REQUEST_WITH_EXEC);

    await openPopup(page);
    await popupRow(page, 'Query Parameters').click();

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
