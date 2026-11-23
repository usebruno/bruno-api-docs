import { test, expect } from '../../playwright';
import { generalFixtureCollection, generalOneEnvCollection } from '../../../src/e2eFixtures/generalCollection';

test.use({ colorScheme: 'light' });

test.describe('Standalone bundle lifecycle', () => {
  test.beforeEach(async ({ standalonePage }) => {
    await standalonePage.goto();
  });

  test('Bruno.apiDocs renders the collection into the target', async ({ standalonePage, pageHeader, sidebar }) => {
    await standalonePage.mount('first', { content: generalFixtureCollection });

    await expect(pageHeader.brandName).toHaveText('General Fixture');
    await expect(sidebar.item('Alpha')).toBeVisible();
    await expect(sidebar.item('Beta')).toBeVisible();
    await expect(standalonePage.target('second')).toBeEmpty();
  });

  test('updateCollection swaps the rendered collection in place', async ({ standalonePage, pageHeader, sidebar }) => {
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await expect(pageHeader.brandName).toHaveText('General Fixture');

    await standalonePage.updateCollection('first', generalOneEnvCollection);

    await expect(pageHeader.brandName).toHaveText('Single Environment');
    await expect(sidebar.item('Ping')).toBeVisible();
    await expect(sidebar.item('Alpha')).toHaveCount(0);
  });

  test('updateOptions applies a new theme to the mounted docs', async ({ standalonePage, themeToggle }) => {
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-light');

    await standalonePage.updateOptions('first', { theme: { mode: 'dark' } });

    await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-dark');
    await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
  });

  test('destroy empties the target and leaves the page theme attribute as it was', async ({
    standalonePage,
    pageHeader,
    themeToggle
  }) => {
    await standalonePage.mount('first', { content: generalFixtureCollection, theme: { mode: 'dark' } });
    await expect(pageHeader.brandName).toHaveText('General Fixture');

    await standalonePage.destroy('first');

    await expect(standalonePage.target('first')).toBeEmpty();
    await expect(pageHeader.root).toHaveCount(0);
    await expect(themeToggle.html).toHaveAttribute('data-theme', 'default-dark');
  });
});
