import { test, expect } from '../../playwright';

const GET_ALL_CUSTOMERS = ['billing', 'customers', 'Get All Customers'];
const OK_EXAMPLE = '200 OK - first page';
const BAD_REQUEST_EXAMPLE = '400 Bad Request - invalid per_page';
const REQUEST_PATH = '#/billing/customers/get-all-customers';
const OK_EXAMPLE_SLUG = '200-ok-first-page';
const OK_EXAMPLE_URL = `/${REQUEST_PATH}/${OK_EXAMPLE_SLUG}`;
const DRAWER = { width: 1023, height: 900 };

test.describe('Sidebar - Examples (docs)', () => {
  test.beforeEach(async ({ requestPage }) => {
    await requestPage.open(GET_ALL_CUSTOMERS);
  });

  test('keeps a request with examples collapsed until its toggle is expanded', async ({ sidebar }) => {
    await expect(sidebar.exampleToggle('Get All Customers')).toBeVisible();
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveCount(0);

    await sidebar.toggleExamples('Get All Customers');
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toBeVisible();
    await expect(sidebar.exampleRow(BAD_REQUEST_EXAMPLE)).toBeVisible();
  });

  test('clicking an example navigates to the parent request page and highlights the matching example card', async ({
    sidebar,
    requestPage,
    page
  }) => {
    await sidebar.toggleExamples('Get All Customers');
    await sidebar.exampleRow(OK_EXAMPLE).click();

    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'request');
    await expect(page).toHaveURL(/#\/billing\/customers\/get-all-customers\/200-ok-first-page$/);

    const activeCard = requestPage.examples.activeCard;
    await expect(activeCard).toBeVisible();
    await expect(activeCard).toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);
    // Only the example row is active, not its parent request row.
    await expect(sidebar.item('Get All Customers')).not.toHaveClass(/active/);
  });

  test('switching to a different example moves the highlight to it', async ({ sidebar, requestPage }) => {
    await sidebar.toggleExamples('Get All Customers');
    await sidebar.exampleRow(OK_EXAMPLE).click();
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);

    await sidebar.exampleRow(BAD_REQUEST_EXAMPLE).click();

    const activeCard = requestPage.examples.activeCard;
    await expect(activeCard).toContainText(BAD_REQUEST_EXAMPLE);
    await expect(activeCard).not.toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(BAD_REQUEST_EXAMPLE)).toHaveClass(/active/);
  });

  test('deep-links the example: opening its url (share) and reloading restore the highlight', async ({
    page,
    requestPage,
    sidebar
  }) => {
    await page.goto(OK_EXAMPLE_URL);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'request');
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);

    await page.reload();
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);
  });

  test('browser back and forward move the highlight between examples', async ({ sidebar, requestPage, page }) => {
    await sidebar.toggleExamples('Get All Customers');
    await sidebar.exampleRow(OK_EXAMPLE).click();
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);
    await sidebar.exampleRow(BAD_REQUEST_EXAMPLE).click();
    await expect(requestPage.examples.activeCard).toContainText(BAD_REQUEST_EXAMPLE);
    await expect(sidebar.exampleRow(BAD_REQUEST_EXAMPLE)).toHaveClass(/active/);

    await page.goBack();
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);
    await expect(sidebar.exampleRow(BAD_REQUEST_EXAMPLE)).not.toHaveClass(/active/);
    await page.goForward();
    await expect(requestPage.examples.activeCard).toContainText(BAD_REQUEST_EXAMPLE);
    await expect(sidebar.exampleRow(BAD_REQUEST_EXAMPLE)).toHaveClass(/active/);
    await expect(sidebar.exampleRow(OK_EXAMPLE)).not.toHaveClass(/active/);
  });

  test('an unknown example slug falls back to the request page with no highlight', async ({ page, requestPage }) => {
    await page.goto(`/${REQUEST_PATH}/does-not-exist`);
    await expect(page.getByTestId('page')).toHaveAttribute('data-page-type', 'request');
    await expect(requestPage.examples.activeCard).toHaveCount(0);
  });
});

test.describe('Sidebar - Examples (just below desktop, drawer)', () => {
  test.use({ viewport: DRAWER });

  test('opens a saved example from the drawer and keeps pagination usable', async ({ page, sidebar, requestPage }) => {
    await page.goto(`/${REQUEST_PATH}`);
    await sidebar.openDrawer();
    await sidebar.toggleExamples('Get All Customers');
    await sidebar.exampleRow(OK_EXAMPLE).click();

    await expect(sidebar.backdrop).toBeHidden();
    await expect(page).toHaveURL(/#\/billing\/customers\/get-all-customers\/200-ok-first-page$/);
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);

    await sidebar.openDrawer();
    await expect(sidebar.exampleRow(OK_EXAMPLE)).toHaveClass(/active/);
    await sidebar.closeDrawerViaBackdrop();

    await page.getByTestId('next-link').click();
    await expect(page).not.toHaveURL(/200-ok-first-page/);
    await expect(page.getByTestId('page')).toBeVisible();
    await expect(sidebar.inline).toHaveCount(0);

    await page.goBack();
    await expect(requestPage.examples.activeCard).toContainText(OK_EXAMPLE);
  });
});
