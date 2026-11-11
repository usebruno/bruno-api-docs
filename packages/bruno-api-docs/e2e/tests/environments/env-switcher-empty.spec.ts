import { test, expect } from '../../playwright';

const NO_ENVIRONMENTS = '/?fixture=descriptions';

test.describe('Environment switcher with no environments', () => {
  test('is hidden in the docs header', async ({ page, envSwitcher }) => {
    await page.goto(NO_ENVIRONMENTS);
    await expect(envSwitcher.showVarsToggle).toBeVisible();
    await expect(envSwitcher.root).toHaveCount(0);
  });

  test('opens a menu with "No Environment" and Configure in the playground header', async ({ page, playground }) => {
    await page.goto(`${NO_ENVIRONMENTS}#/?pg=1&dock=bottom`);
    await expect(playground.envSwitcher.trigger).toContainText('No Environment');

    await playground.envSwitcher.open();
    await expect(playground.envSwitcher.option('~no-environment')).toBeVisible();

    await playground.envSwitcher.option('~configure').click();
    await expect(playground.view.getByText('No environments found in this collection')).toBeVisible();
  });
});
