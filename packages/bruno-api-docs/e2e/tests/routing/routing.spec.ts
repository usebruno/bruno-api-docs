import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';

const FIXTURE = '/?fixture=folders';
const page$ = (s: string) => `${FIXTURE}#/${s}`;

const DESKTOP = { width: 1280, height: 900 };
const TABLET = { width: 768, height: 900 };
const MOBILE = { width: 375, height: 800 };

/** Overview's slug is the hash root: either no hash or exactly `#/`. */
const expectOverviewHash = (page: Page) =>
  expect(page).toHaveURL(/\/\?fixture=folders(?:#\/)?$/);

/** Both pagination links are fully inside the viewport, and the document is not wider than it. */
const paginationFits = async (page: Page, width: number) => {
  // 17px covers a classic scrollbar; the rest is subpixel rounding.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(width + 20);

  for (const testId of ['prev-link', 'next-link'] as const) {
    const link = page.getByTestId(testId);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport({ ratio: 1 });
  }
};

test.describe('page-based navigation', () => {
  test('deep-link to a nested request renders only that page on fresh load', async ({ page }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));

    const active = page.getByTestId('page');
    await expect(active).toHaveAttribute('data-page-slug', 'bookings/lifecycle/create-booking');
    await expect(active).toHaveAttribute('data-page-type', 'request');
    await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toHaveCount(0);
  });

  test('breadcrumb reflects the folder hierarchy', async ({ page }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));
    const bc = page.getByTestId('request-breadcrumb');
    await expect(bc).toContainText('Hotel API');
    await expect(bc).toContainText('Bookings');
    await expect(bc).toContainText('Lifecycle');
    await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toBeVisible();
  });

  test('auto-expands ancestor folders so the deep-linked item is visible in the sidebar', async ({ page }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));
    await expect(page.getByTestId('sidebar-item').filter({ hasText: 'Cancel Booking' })).toBeVisible();
  });

  test('prev/next walks the hierarchy in sequence order', async ({ page, sidebar }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));

    const next = page.getByTestId('next-link');
    await expect(next).toContainText('Confirm Booking');
    await next.click();

    await expect(page.getByTestId('page')).toHaveAttribute(
      'data-page-slug',
      'bookings/lifecycle/confirm-booking'
    );
    await expect(page).toHaveURL(/#\/bookings\/lifecycle\/confirm-booking$/);
    await expect(page.getByTestId('prev-link')).toContainText('Create Booking');
    await expect(page.getByTestId('next-link')).toContainText('Cancel Booking');

    await expect(sidebar.active).toHaveCount(1);
    await expect(sidebar.active).toHaveAttribute('data-slug', 'bookings/lifecycle/confirm-booking');

    await page.getByTestId('prev-link').click();
    await expect(page.getByTestId('page')).toHaveAttribute(
      'data-page-slug',
      'bookings/lifecycle/create-booking'
    );
    await expect(page).toHaveURL(/#\/bookings\/lifecycle\/create-booking$/);
    await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toBeVisible();
  });

  test('slug URL is stable across reload', async ({ page }) => {
    await page.goto(page$('authentication/login'));
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/#\/authentication\/login$/);
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible();
  });

  test('a script item renders as its own script page', async ({ page }) => {
    await page.goto(page$('setup-script'));
    const active = page.getByTestId('page');
    await expect(active).toHaveAttribute('data-page-slug', 'setup-script');
    await expect(active).toHaveAttribute('data-page-type', 'script');
    await expect(page.getByRole('heading', { name: 'Setup Script', level: 1 })).toBeVisible();
  });

  test('a folder whose name has special characters resolves via its encoded slug', async ({ page }) => {
    // "Customers/%$" -> the slash/percent/dollar are percent-encoded, so the
    // folder keeps its own page instead of colliding or collapsing.
    await page.goto(page$('customers%2F%25%24'));
    const active = page.getByTestId('page');
    await expect(active).toHaveAttribute('data-page-slug', 'customers%2F%25%24');
    await expect(active).toHaveAttribute('data-page-type', 'folder');
    await expect(page.getByTestId('folder-title')).toHaveText('Customers/%$');
  });

  test('a request inside a special-character folder deep-links (encoded parent + separator)', async ({ page }) => {
    await page.goto(page$('customers%2F%25%24/list-customers'));
    const active = page.getByTestId('page');
    await expect(active).toHaveAttribute('data-page-slug', 'customers%2F%25%24/list-customers');
    await expect(active).toHaveAttribute('data-page-type', 'request');
    await expect(page.getByTestId('request-title')).toHaveText('List customers');
  });

  test('unknown slug redirects to the overview', async ({ page }) => {
    await page.goto(page$('does/not/exist'));
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'overview');
  });

  test('clicking a sidebar item navigates to its slug route', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.locator('[data-testid="sidebar-item"][data-slug="authentication"]').click();
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-slug', 'authentication');
    await expect(page).toHaveURL(/#\/authentication$/);
  });

  test('editing the hash navigates without a full reload and highlights the sidebar', async ({ page, sidebar }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'overview');
    await page.evaluate(() => {
      (window as Window & { __docsStay?: boolean }).__docsStay = true;
    });

    await page.evaluate(() => {
      window.location.hash = '#/authentication/login';
    });

    await expect(page.getByTestId('page')).toHaveAttribute('data-page-slug', 'authentication/login');
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible();
    await expect(sidebar.itemBySlug('authentication/login')).toHaveClass(/active/);
    expect(await page.evaluate(() => (window as Window & { __docsStay?: boolean }).__docsStay)).toBe(true);
  });

  test('browser back and forward keep url, content, and sidebar in sync', async ({ page, sidebar }) => {
    await page.goto(FIXTURE);
    await sidebar.itemBySlug('authentication').click();
    await expect(page.getByTestId('folder-title')).toHaveText('Authentication');
    await expect(sidebar.itemBySlug('authentication')).toHaveClass(/active/);

    await sidebar.itemBySlug('authentication/login').click();
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/#\/authentication\/login$/);
    await expect(sidebar.itemBySlug('authentication/login')).toHaveClass(/active/);

    await page.goBack();
    await expect(page).toHaveURL(/#\/authentication$/);
    await expect(page.getByTestId('folder-title')).toHaveText('Authentication');
    await expect(sidebar.itemBySlug('authentication')).toHaveClass(/active/);
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toHaveCount(0);

    await page.goForward();
    await expect(page).toHaveURL(/#\/authentication\/login$/);
    await expect(page.getByRole('heading', { name: 'Login', level: 1 })).toBeVisible();
    await expect(sidebar.itemBySlug('authentication/login')).toHaveClass(/active/);
  });

  test('first page shows only Next and last page shows only Previous', async ({ page }) => {
    await page.goto(FIXTURE);
    await expectOverviewHash(page);
    await expect(page.getByTestId('prev-link')).toHaveCount(0);
    await expect(page.getByTestId('next-link')).toContainText('Environments');

    await page.getByTestId('next-link').click();
    await expect(page.getByTestId('environments-title')).toHaveText('Environments');
    await expect(page.getByTestId('prev-link')).toContainText('Hotel API');
    await expect(page.getByTestId('next-link')).toContainText('Authentication');

    await page.getByTestId('prev-link').click();
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'overview');
    await expectOverviewHash(page);
    await expect(page.getByTestId('prev-link')).toHaveCount(0);
    await expect(page.getByTestId('next-link')).toContainText('Environments');

    await page.goto(page$('setup-script'));
    await expect(page.getByTestId('script-title')).toHaveText('Setup Script');
    await expect(page.getByTestId('next-link')).toHaveCount(0);
    await expect(page.getByTestId('prev-link')).toContainText('Health Check');

    await page.getByTestId('prev-link').click();
    await expect(page.getByTestId('request-title')).toContainText('Health Check');
    await expect(page.getByTestId('next-link')).toContainText('Setup Script');
    await expect(page).toHaveURL(/#\/health-check$/);

    await page.getByTestId('next-link').click();
    await expect(page.getByTestId('next-link')).toHaveCount(0);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-slug', 'setup-script');
  });

  test('rapid Next clicks land on the last target with content, hash, and sidebar in sync', async ({ page, sidebar }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));
    await expect(page.getByTestId('next-link')).toBeVisible();

    // Clicks run in the page so Playwright does not wait for each link to go stable.
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i += 1) {
        const link = document.querySelector<HTMLAnchorElement>('[data-testid="next-link"]');
        if (!link) throw new Error(`next link missing on click ${i + 1}`);
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    await expect(page.getByTestId('page')).toHaveAttribute('data-page-slug', 'bookings/payments');
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'folder');
    await expect(page).toHaveURL(/#\/bookings\/payments$/);
    await expect(page.getByTestId('folder-title')).toHaveText('Payments');
    await expect(sidebar.itemBySlug('bookings/payments')).toHaveClass(/active/);
    await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Confirm Booking', level: 1 })).toHaveCount(0);
  });

  test('a distant sidebar jump after Next shows only that page', async ({ page, sidebar }) => {
    await page.goto(page$('bookings/lifecycle/create-booking'));
    await page.getByTestId('next-link').click();
    await expect(page).toHaveURL(/#\/bookings\/lifecycle\/confirm-booking$/);

    await sidebar.itemBySlug('health-check').click();

    await expect(page.getByTestId('page')).toHaveAttribute('data-page-slug', 'health-check');
    await expect(page).toHaveURL(/#\/health-check$/);
    await expect(page.getByTestId('request-title')).toContainText('Health Check');
    await expect(sidebar.itemBySlug('health-check')).toHaveClass(/active/);
    await expect(page.getByRole('heading', { name: 'Confirm Booking', level: 1 })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toHaveCount(0);
  });

  for (const viewport of [
    { name: 'desktop', size: DESKTOP },
    { name: 'tablet', size: TABLET },
    { name: 'mobile', size: MOBILE }
  ]) {
    test(`Next and Previous stay usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await page.goto(page$('bookings/lifecycle/create-booking'));

      // Create Booking is mid-hierarchy, so both cards are on screen.
      await paginationFits(page, viewport.size.width);

      const next = page.getByTestId('next-link');
      await expect(next).toBeVisible();
      await next.click();

      await expect(page.getByTestId('page')).toHaveAttribute(
        'data-page-slug',
        'bookings/lifecycle/confirm-booking'
      );
      await expect(page).toHaveURL(/#\/bookings\/lifecycle\/confirm-booking$/);
      await expect(page.getByRole('heading', { name: 'Create Booking', level: 1 })).toHaveCount(0);
      await paginationFits(page, viewport.size.width);

      const prev = page.getByTestId('prev-link');
      await expect(prev).toBeVisible();
      await prev.click();
      await expect(page).toHaveURL(/#\/bookings\/lifecycle\/create-booking$/);
    });
  }
});
