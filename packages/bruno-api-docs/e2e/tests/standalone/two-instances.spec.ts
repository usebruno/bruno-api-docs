import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const secondCollection = { ...generalFixtureCollection, info: { name: 'Second', version: '1.0.0' } };

test.use({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });

test.describe('Two Bruno.apiDocs instances on one page', () => {
  test.beforeEach(async ({ standalonePage }) => {
    await standalonePage.goto();
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await standalonePage.mount('second', { content: secondCollection });
  });

  test('switching the environment in one leaves the other on its own', async ({ page, standalonePage, envSwitcher }) => {
    const first = standalonePage.target('first');
    const second = standalonePage.target('second');
    await expect(second.getByTestId('brand-name')).toHaveText('Second');

    await first.getByTestId('env-switcher').click();
    await envSwitcher.option('Prod').click();

    await expect(first.getByTestId('env-switcher')).toHaveText('Prod');
    await expect(second.getByTestId('env-switcher')).toHaveText('Dev');
    expect(await page.evaluate(() => sessionStorage.getItem('oc-docs.env')))
      .toBe(JSON.stringify({ activeEnvName: 'Prod', showVars: false }));
  });

  test('toggling the theme in one darkens the whole page but only flips that instance\'s toggle', async ({
    standalonePage,
    themeToggle
  }) => {
    const first = standalonePage.target('first');
    const second = standalonePage.target('second');

    await first.getByTestId('theme-toggle').click();

    await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-dark');
    await expect(first.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to light theme');
    await expect(second.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to dark theme');
  });

  test('a light theme passed to the other afterwards keeps the page dark and flips its toggle to the saved choice', async ({
    standalonePage,
    themeToggle
  }) => {
    const first = standalonePage.target('first');
    const second = standalonePage.target('second');
    await first.getByTestId('theme-toggle').click();
    await expect(second.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to dark theme');

    await standalonePage.updateOptions('second', { theme: { mode: 'light' } });

    await expect(second.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to light theme');
    await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-dark');
  });

  test('navigating in one changes the shared URL hash but only that instance\'s page', async ({ page, standalonePage }) => {
    const first = standalonePage.target('first');
    const second = standalonePage.target('second');

    await first.getByTestId('sidebar-item').filter({ hasText: 'Alpha' }).click();

    await expect(first.getByTestId('request-title')).toHaveText('Alpha');
    await expect(page).toHaveURL(standalonePage.url('#/alpha'));
    await expect(second.getByTestId('overview')).toBeVisible();
    await expect(second.getByTestId('request-title')).toHaveCount(0);
  });

  test('a request sent from one playground shows its response only in that instance', async ({ page, standalonePage }) => {
    const first = standalonePage.target('first');
    const second = standalonePage.target('second');
    await page.route('**/alpha**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' })
    );
    await first.getByTestId('sidebar-item').filter({ hasText: 'Alpha' }).click();
    await first.getByTestId('request-try-button').click();
    await expect(first.getByTestId('playground-view')).toBeVisible();

    await first.getByTestId('query-bar-send').click();

    await expect(first.getByTestId('response-status')).toHaveText('200 OK');
    await expect(second.getByTestId('playground-view')).toHaveCount(0);
    await expect(second.getByTestId('response-status')).toHaveCount(0);
    await expect(page).toHaveURL(standalonePage.url('#/alpha?pg=1&dock=bottom&pgReq=alpha'));
  });
});
