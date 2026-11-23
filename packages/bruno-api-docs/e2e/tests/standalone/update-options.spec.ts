import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const THEME_STORAGE_KEY = 'oc-docs.theme';
const SAVED_DARK = JSON.stringify({ variant: 'default', mode: 'dark' });
const GIT_URL = 'https://github.com/usebruno/bruno-testbench.git';
const FETCH_IN_BRUNO_HREF = `https://fetch.usebruno.com?url=${encodeURIComponent(GIT_URL)}`;

test.use({ colorScheme: 'light' });

test.describe('updateOptions after mount', () => {
  test.describe('theme and hideThemeSwitcher, with a saved dark choice', () => {
    test.beforeEach(async ({ page, standalonePage }) => {
      await page.addInitScript(({ key, value }) => {
        localStorage.setItem(key, value);
      }, { key: THEME_STORAGE_KEY, value: SAVED_DARK });
      await standalonePage.goto();
      await standalonePage.mount('first', { content: generalFixtureCollection });
    });

    test('a host theme passed later applies its variant but not its mode over the saved choice', async ({
      standalonePage,
      themeToggle
    }) => {
      await standalonePage.updateOptions('first', { theme: { variant: 'backstage', mode: 'light' } });

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'backstage-dark');
      await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
    });

    test('hiding the switcher later removes the toggle and follows the OS, ignoring the saved choice', async ({
      page,
      standalonePage,
      themeToggle,
      pageHeader
    }) => {
      await standalonePage.updateOptions('first', { hideThemeSwitcher: true });

      await expect(themeToggle.button).toHaveCount(0);
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-light');
      await expect(pageHeader.brandName).toHaveText('General Fixture');
      expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(SAVED_DARK);
    });

    test('showing the switcher again brings back the toggle and the saved choice', async ({ standalonePage, themeToggle }) => {
      await standalonePage.updateOptions('first', { hideThemeSwitcher: true });
      await expect(themeToggle.button).toHaveCount(0);

      await standalonePage.updateOptions('first', { hideThemeSwitcher: false });

      await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-dark');
    });
  });

  test.describe('gitCollectionUrl', () => {
    test.beforeEach(async ({ standalonePage }) => {
      await standalonePage.goto();
      await standalonePage.mount('first', { content: generalFixtureCollection });
    });

    test('setting it later turns Open in Bruno into a Fetch-in-Bruno link', async ({ standalonePage, pageHeader }) => {
      await expect(pageHeader.openInBruno).toHaveAttribute('type', 'button');

      await standalonePage.updateOptions('first', { gitCollectionUrl: GIT_URL });

      await expect(pageHeader.openInBruno).toHaveAttribute('href', FETCH_IN_BRUNO_HREF);
      await expect(pageHeader.openInBruno).toHaveAttribute('target', '_blank');
    });

    test('clearing it later turns Open in Bruno back into a button', async ({ standalonePage, pageHeader }) => {
      await standalonePage.updateOptions('first', { gitCollectionUrl: GIT_URL });
      await expect(pageHeader.openInBruno).toHaveAttribute('href', FETCH_IN_BRUNO_HREF);

      await standalonePage.updateOptions('first', { gitCollectionUrl: null });

      await expect(pageHeader.openInBruno).toHaveAttribute('type', 'button');
      await expect(pageHeader.openInBruno).not.toHaveAttribute('href', /.*/);
    });

    test('repositoryUrl, accepted by Bruno.apiDocs, is ignored by updateOptions', async ({
      standalonePage,
      pageHeader,
      themeToggle
    }) => {
      await standalonePage.updateOptions('first', { repositoryUrl: GIT_URL, theme: { variant: 'backstage' } });

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'backstage-light');
      await expect(pageHeader.openInBruno).toHaveAttribute('type', 'button');
      await expect(pageHeader.openInBruno).not.toHaveAttribute('href', /.*/);
      await expect(pageHeader.brandName).toHaveText('General Fixture');
    });
  });
});
