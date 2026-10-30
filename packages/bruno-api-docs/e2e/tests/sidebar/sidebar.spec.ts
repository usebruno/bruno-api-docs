import { test, expect } from '../../playwright';
import type { SidebarComponent } from '../../components/sidebar.component';

const FOLDERS = '/?fixture=folders';
const QA = '/?fixture=qa';
// AppShell switches at 1024: inline from there up, drawer below.
const INLINE = { width: 1024, height: 900 };
const DRAWER = { width: 1023, height: 900 };

const folderOpen = (sidebar: SidebarComponent, name: string, open: boolean) =>
  expect(sidebar.folderChevron(name)).toHaveAttribute('aria-expanded', open ? 'true' : 'false');

test.describe('sidebar - desktop (inline, collapsible)', () => {
  test.use({ viewport: INLINE });

  test('renders the inline sidebar with overview, environments, folders and requests', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await expect(sidebar.inline).toBeVisible();
    await expect(sidebar.overview).toBeVisible();
    await expect(sidebar.environments).toBeVisible();
    await expect(sidebar.hamburger).toHaveCount(0);
    await expect(sidebar.drawer).toHaveCount(0);
    await expect(sidebar.item('Authentication')).toBeVisible();

    await sidebar.toggleFolder('Authentication');
    await expect(sidebar.item('Login')).toBeVisible();
  });

  test('shows method badges on requests inside an expanded folder', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await sidebar.toggleFolder('Rooms');

    await expect(sidebar.methodBadge('List Rooms')).toHaveText('GET');
    await expect(sidebar.methodBadge('Create Room')).toHaveText('POST');
    await expect(sidebar.methodBadge('Update Room')).toHaveText('PUT');
    await expect(sidebar.methodBadge('Patch Room')).toHaveText('PATCH');
    await expect(sidebar.methodBadge('Delete Room')).toHaveText('DEL');
    await expect(sidebar.methodBadge('Room Options')).toHaveText('OPT');
  });

  test('reveals the collapse icon while the sidebar is hovered', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await expect(sidebar.collapseButton).toHaveCSS('opacity', '0');

    await sidebar.inline.hover();
    await expect(sidebar.collapseButton).toHaveCSS('opacity', '1');
  });

  test('collapses the whole panel and re-opens it', async ({ page, sidebar, overviewPage }) => {
    await page.goto(FOLDERS);
    const before = await overviewPage.main.boundingBox();

    await sidebar.collapse();
    await expect(sidebar.inline).toHaveCount(0);
    await expect(sidebar.expandButton).toBeVisible();

    const after = await overviewPage.main.boundingBox();
    expect(after!.x).toBeLessThan(before!.x);
    expect(after!.width).toBeGreaterThan(before!.width);

    await sidebar.expand();
    await expect(sidebar.inline).toBeVisible();
  });

  test('shows a folder request when opened and hides it when closed', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await folderOpen(sidebar, 'Authentication', false);

    await sidebar.toggleFolder('Authentication');
    await folderOpen(sidebar, 'Authentication', true);
    await expect(sidebar.item('Login')).toBeVisible();

    await sidebar.toggleFolder('Authentication');
    await folderOpen(sidebar, 'Authentication', false);
    await expect(sidebar.item('Login')).toHaveCount(0);
  });

  test('expands and collapses an empty folder without changing the rest of the tree', async ({ page, sidebar }) => {
    await page.goto(QA);
    await sidebar.toggleFolder('Edge Cases');
    await expect(sidebar.item('Exactly One')).toBeVisible();
    const before = await sidebar.items.count();

    await sidebar.toggleFolder('Empty Folder');
    await folderOpen(sidebar, 'Empty Folder', true);
    await expect(sidebar.items).toHaveCount(before);

    await sidebar.toggleFolder('Empty Folder');
    await folderOpen(sidebar, 'Empty Folder', false);
    await expect(sidebar.items).toHaveCount(before);
    await expect(sidebar.item('Exactly One')).toBeVisible();
  });

  test('lists folders, then requests, then scripts in collection order', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await expect(sidebar.labels).toHaveText([
      'Authentication',
      'Rooms',
      'Bookings',
      'Guests',
      'Customers/%$',
      'Café & Résumés',
      'Health Check',
      'Setup Script.js'
    ]);

    await sidebar.toggleFolder('Bookings');
    await expect(sidebar.labels).toHaveText([
      'Authentication',
      'Rooms',
      'Bookings',
      'Lifecycle',
      'Payments',
      'List Bookings',
      'Get Booking',
      'Guests',
      'Customers/%$',
      'Café & Résumés',
      'Health Check',
      'Setup Script.js'
    ]);
  });

  test('keeps deeply nested rows inside the sidebar, indented and aligned', async ({ page, sidebar }) => {
    await page.goto(QA);
    for (const name of ['Billing', 'Customers', 'Payment', 'Auth', 'Tokens', 'Legacy v3']) {
      await sidebar.toggleFolder(name);
    }

    await expect(sidebar.item('Revoke Token')).toBeVisible();
    await expect(sidebar.methodBadge('Revoke Token')).toHaveText('DEL');

    const left = async (name: string) => (await sidebar.item(name).boundingBox())!.x;
    expect(await left('Customers')).toBeGreaterThan(await left('Billing'));
    expect(await left('Legacy v3')).toBeGreaterThan(await left('Auth'));
    expect(await left('Revoke Token')).toBeGreaterThan(await left('Legacy v3'));

    const sidebarBox = await sidebar.inline.boundingBox();
    const longName = 'Rotate Signing Key For Legacy Token Issuance Endpoint';
    const longRow = await sidebar.item(longName).boundingBox();
    expect(longRow!.x + longRow!.width).toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width + 1);

    const label = sidebar.item(longName).getByTestId('sidebar-item-label');
    const truncated = await label.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(truncated).toBe(true);
  });

  test('expands ancestor folders when a nested request is opened from search', async ({
    page,
    sidebar,
    search,
    requestPage
  }) => {
    await page.goto(FOLDERS);
    await expect(sidebar.item('Cancel Booking')).toHaveCount(0);

    await search.field.click();
    await search.field.fill('cancel booking');
    await search.result('Cancel Booking').click();

    await expect(requestPage.title).toHaveText('Cancel Booking');
    await folderOpen(sidebar, 'Bookings', true);
    await folderOpen(sidebar, 'Lifecycle', true);
    await expect(sidebar.item('Cancel Booking')).toBeVisible();
  });

  test('keeps folders expanded across navigation', async ({ page, sidebar }) => {
    await page.goto(`${FOLDERS}#/bookings/lifecycle/create-booking`);
    await expect(sidebar.item('Cancel Booking')).toBeVisible();
    await sidebar.overview.click();
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'overview');
    await expect(sidebar.item('Cancel Booking')).toBeVisible();
  });

  test('collapses a folder holding the active item without changing the view', async ({ page, sidebar }) => {
    await page.goto(`${FOLDERS}#/bookings/lifecycle/create-booking`);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'request');
    await folderOpen(sidebar, 'Lifecycle', true);
    await expect(sidebar.item('Cancel Booking')).toBeVisible();

    await sidebar.toggleFolder('Lifecycle');

    await folderOpen(sidebar, 'Lifecycle', false);
    await expect(sidebar.item('Cancel Booking')).toHaveCount(0);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'request');
    await expect(page).toHaveURL(/#\/bookings\/lifecycle\/create-booking$/);
  });
});

test.describe('sidebar - just below desktop (off-canvas drawer)', () => {
  test.use({ viewport: DRAWER });

  test('has no inline panel and opens the drawer from the hamburger', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await expect(sidebar.inline).toHaveCount(0);
    await expect(sidebar.backdrop).toBeHidden();
    await sidebar.openDrawer();
    await expect(sidebar.backdrop).toBeVisible();
    await expect(sidebar.drawer).toHaveAttribute('aria-hidden', 'false');
  });

  test('closes the drawer when a nav item is tapped', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await sidebar.openDrawer();
    await expect(sidebar.backdrop).toBeVisible();
    await sidebar.overview.click();
    await expect(sidebar.backdrop).toBeHidden();
  });

  test('closes the drawer when the backdrop is tapped', async ({ page, sidebar }) => {
    await page.goto(FOLDERS);
    await sidebar.openDrawer();
    await expect(sidebar.backdrop).toBeVisible();
    await sidebar.closeDrawerViaBackdrop();
    await expect(sidebar.backdrop).toBeHidden();
  });
});
