import { test, expect } from '../../playwright';

const GET_ALL_CUSTOMERS = ['billing', 'customers', 'Get All Customers'];
const HIDDEN_PLAYGROUND_URL = '/?hidePlayground=1';

test.describe('hidePlayground', () => {
  test('shows the Try button when the option is omitted', async ({ requestPage }) => {
    await requestPage.open(GET_ALL_CUSTOMERS);
    await expect(requestPage.urlBar.tryButton).toBeVisible();
  });

  test('removes the Try button from request pages', async ({ page, requestPage }) => {
    await page.goto(HIDDEN_PLAYGROUND_URL);
    await requestPage.sidebar.open(GET_ALL_CUSTOMERS);
    await expect(requestPage.title).toBeVisible();
    await expect(requestPage.urlBar.url).toBeVisible();
    await expect(requestPage.urlBar.tryButton).toHaveCount(0);
  });

  test('renders the request docs page for a playground deep link', async ({ page, requestPage, playground }) => {
    await page.goto(HIDDEN_PLAYGROUND_URL);
    await requestPage.sidebar.open(GET_ALL_CUSTOMERS);
    const slug = await page.getByTestId('page').getAttribute('data-page-slug');
    expect(slug).toBeTruthy();

    await page.goto(`${HIDDEN_PLAYGROUND_URL}#/${slug}?pg=1&dock=bottom&pgReq=${slug}`);
    await expect(requestPage.title).toHaveText('Get All Customers');
    await expect(playground.header).toHaveCount(0);
    await expect(page.getByTestId('app-shell')).toHaveAttribute('data-dock', 'none');
  });

  test('opens the playground from a pg=1 link when the option is omitted', async ({ page, playground }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await expect(playground.bottomPanel).toBeVisible();
  });

  for (const dock of ['bottom', 'inline', 'modal']) {
    test(`keeps the playground closed for pg=1&dock=${dock}`, async ({ page, playground }) => {
      await page.goto(`${HIDDEN_PLAYGROUND_URL}#/?pg=1&dock=${dock}`);
      await expect(page.getByTestId('page')).toBeVisible();
      await expect(playground.header).toHaveCount(0);
      await expect(page.getByTestId(`playground-dock-${dock}-panel`)).toHaveCount(0);
      await expect(page.getByTestId('app-shell')).toHaveAttribute('data-dock', 'none');
    });
  }

  for (const dock of ['bottom', 'inline', 'modal']) {
    test(`keeps the playground closed for pg=1&dock=${dock}&hidePlayground=1 in the route`, async ({ page, playground }) => {
      await page.goto(`/#/?pg=1&dock=${dock}&hidePlayground=1`);
      await expect(page.getByTestId('page')).toBeVisible();
      await expect(playground.header).toHaveCount(0);
      await expect(page.getByTestId(`playground-dock-${dock}-panel`)).toHaveCount(0);
      await expect(page.getByTestId('app-shell')).toHaveAttribute('data-dock', 'none');
    });
  }

  test('keeps the playground closed for a pg=1 link on a mobile viewport', async ({ page, playground }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${HIDDEN_PLAYGROUND_URL}#/?pg=1&dock=bottom`);
    await expect(page.getByTestId('page')).toBeVisible();
    await expect(playground.mobilePanel).toHaveCount(0);
    await expect(playground.header).toHaveCount(0);
  });
});
