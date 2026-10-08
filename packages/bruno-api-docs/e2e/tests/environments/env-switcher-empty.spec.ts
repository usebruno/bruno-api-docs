import { test, expect } from '../../playwright';

const NO_ENVIRONMENTS = '/?fixture=descriptions';

test.describe('Environment switcher with no environments', () => {
  test('is hidden in the docs header', async ({ page, envSwitcher }) => {
    await page.goto(NO_ENVIRONMENTS);
    await expect(envSwitcher.showVarsToggle).toBeVisible();
    await expect(envSwitcher.root).toHaveCount(0);
  });

  test('still shows its empty state in the playground sidebar', async ({ page, playground }) => {
    await page.goto(`${NO_ENVIRONMENTS}#/?pg=1&dock=bottom`);
    await playground.ensureSidebarOpen();
    await expect(playground.envSwitcher.trigger).toBeVisible();
    await expect(playground.envSwitcher.trigger).toContainText('No environments');
  });

  test('shows plain text in the playground, with no caret and nothing to open', async ({ page, playground }) => {
    await page.goto(`${NO_ENVIRONMENTS}#/?pg=1&dock=bottom`);
    await playground.ensureSidebarOpen();
    const { trigger } = playground.envSwitcher;

    await expect(trigger).toContainText('No environments');
    await expect(playground.envSwitcher.root.getByRole('button')).toHaveCount(0);
    await expect(trigger.locator('.env-switcher-chevron')).toHaveCount(0);

    await trigger.click();
    await expect(playground.envSwitcher.menu).toHaveCount(0);
  });
});
