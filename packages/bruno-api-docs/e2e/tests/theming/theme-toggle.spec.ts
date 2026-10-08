import { test, expect } from '../../playwright';
import { ThemeToggleComponent } from '../../components/layout/theme-toggle.component';

/**
 * The header has one button that flips the whole app between light and dark.
 */
test.describe('Theme switcher', () => {
  test.use({ colorScheme: 'light' });

  test.describe('when the OS prefers light', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('starts in light mode, with the toggle offering "Switch to dark theme"', async ({ themeToggle }) => {
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'light');
      await expect(themeToggle.button).toHaveAccessibleName('Switch to dark theme');
    });

    test('names the action in a tooltip on hover', async ({ themeToggle }) => {
      await themeToggle.button.hover();

      await expect(themeToggle.tooltip).toHaveText('Switch to dark theme');
    });

    test('switches the whole app to dark mode when the toggle is clicked', async ({ themeToggle }) => {
      await themeToggle.toggle();

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');

      await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
    });

    test('switches back to light mode when the toggle is clicked again', async ({ themeToggle }) => {
      await themeToggle.toggle();
      await themeToggle.toggle();

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'light');
    });

    test('remembers the chosen theme across a page reload', async ({ page, themeToggle }) => {
      await themeToggle.toggle();
      await page.reload();

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');
    });

    test('keeps the chosen theme while moving between Overview, Environments, and a request', async ({
      sidebar,
      themeToggle,
      overviewPage,
      environmentsPage,
      requestPage
    }) => {
      await themeToggle.toggle();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');

      await sidebar.overview.click();
      await expect(overviewPage.root).toBeVisible();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');

      await sidebar.environments.click();
      await expect(environmentsPage.root).toBeVisible();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');

      await sidebar.open(['echo json']);
      await expect(requestPage.root).toBeVisible();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');
      await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
    });

    test('remembers the chosen theme when the doc is opened in a new tab', async ({
      context,
      themeToggle
    }) => {
      await themeToggle.toggle();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');

      const reopened = await context.newPage();
      await reopened.goto('/');
      const reopenedToggle = new ThemeToggleComponent(reopened);

      await expect(reopenedToggle.html).toHaveAttribute('data-theme', 'dark');
      await expect(reopenedToggle.button).toHaveAccessibleName('Switch to light theme');
    });
  });

  test.describe('when the OS prefers dark', () => {
    test.use({ colorScheme: 'dark' });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('starts in dark mode, with the toggle offering "Switch to light theme"', async ({ themeToggle }) => {
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'dark');
      await expect(themeToggle.button).toHaveAccessibleName('Switch to light theme');
    });

    test('keeps an explicit light choice after reload, even though the OS prefers dark', async ({ page, themeToggle }) => {
      await themeToggle.toggle();
      await expect(themeToggle.html).toHaveAttribute('data-theme', 'light');

      await page.reload();

      await expect(themeToggle.html).toHaveAttribute('data-theme', 'light');
      await expect(themeToggle.button).toHaveAccessibleName('Switch to dark theme');
    });
  });
});
