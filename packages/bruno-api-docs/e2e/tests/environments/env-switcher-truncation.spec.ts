import { test, expect } from '../../playwright';

const LONG_ENV = 'staging-regression-automation-eu-west-1';
const FIXTURE = '/?fixture=folders';

const isClipped = (el: HTMLElement): boolean => el.scrollWidth > el.clientWidth + 1;

test.describe('Environment switcher name truncation', () => {
  test('clips a long name in the trigger and reveals it in a tooltip on hover', async ({
    page,
    envSwitcher,
    tooltip
  }) => {
    await page.goto(FIXTURE);
    await envSwitcher.selectEnvironment(LONG_ENV);

    const name = envSwitcher.trigger.getByTestId('truncated-text');
    await expect(name).toHaveText(LONG_ENV);
    expect(await name.evaluate(isClipped)).toBe(true);

    await name.hover();
    await expect(tooltip.popup).toBeVisible();
    await expect(tooltip.popup).toHaveText(LONG_ENV);
  });

  test('clips the same long name inside the open dropdown, revealing it via the native title', async ({
    page,
    envSwitcher
  }) => {
    await page.goto(FIXTURE);
    await envSwitcher.open();

    const option = envSwitcher.option(LONG_ENV);
    await expect(option).toHaveAttribute('title', LONG_ENV);
    const name = option.locator('.environment-label-name--clamped');
    await expect(name).toHaveText(LONG_ENV);
    expect(await name.evaluate(isClipped)).toBe(true);
  });

  test('shows no tooltip for a short name, which is not clipped', async ({ page, envSwitcher, tooltip }) => {
    await page.goto(FIXTURE);
    await envSwitcher.selectEnvironment('Dev');

    const name = envSwitcher.trigger.getByTestId('truncated-text');
    await expect(name).toHaveText('Dev');
    expect(await name.evaluate(isClipped)).toBe(false);

    await name.hover();
    await page.waitForTimeout(400);
    await expect(tooltip.popup).toHaveCount(0);
  });
});
