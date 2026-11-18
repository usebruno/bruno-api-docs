import { test, expect } from '../../playwright';
import { EnvSwitcherComponent } from '../../components/layout/env-switcher.component';

const ENV_STORAGE_KEY = 'oc-docs.env';

test.describe('The selected environment survives a reload in the same tab', () => {
  test.beforeEach(async ({ page, envSwitcher }) => {
    await page.goto('/?fixture=general');
    await envSwitcher.selectEnvironment('Prod');
  });

  test('the docs switcher shows the chosen environment after a reload', async ({ page, envSwitcher }) => {
    await expect(envSwitcher.trigger).toHaveText('Prod');

    await page.reload();

    await expect(envSwitcher.trigger).toHaveText('Prod');
    expect(await page.evaluate((key) => sessionStorage.getItem(key), ENV_STORAGE_KEY))
      .toBe(JSON.stringify({ activeEnvName: 'Prod', showVars: false }));
  });

  test('show vars is kept across a reload with the environment', async ({ page, envSwitcher }) => {
    await envSwitcher.toggle();
    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');

    await page.reload();

    await expect(envSwitcher.showVarsToggle).toHaveAttribute('aria-checked', 'true');
    await expect(envSwitcher.trigger).toHaveText('Prod');
  });

  test('the playground opens on the chosen environment after a reload', async ({ page, playground }) => {
    await page.goto('/?fixture=general#/?pg=1&dock=bottom');
    await page.reload();
    await playground.runner.waitFor({ state: 'visible' });
    await playground.ensureSidebarOpen();

    await expect(playground.envSwitcher.trigger).toHaveText('Prod');
  });

  test('a new tab starts on the first environment', async ({ context, envSwitcher }) => {
    await expect(envSwitcher.trigger).toHaveText('Prod');

    const fresh = await context.newPage();
    await fresh.goto('/?fixture=general');

    await expect(new EnvSwitcherComponent(fresh).trigger).toHaveText('Dev');
  });
});
