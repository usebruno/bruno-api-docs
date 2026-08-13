import { test, expect } from '../../playwright';

/**
 * The environment switcher passes `matchTriggerWidth` to its MenuDropdown, so
 * the menu is floored at the trigger's width and never renders narrower than the
 * button that opened it. The env names here are short, so the menu's natural
 * content sits at the dropdown's 10rem floor; we widen the trigger past that
 * floor to prove the popover grows to match a wider trigger.
 */

const DESKTOP = { width: 1280, height: 900 };

test.describe('env switcher menu width', () => {
  test.use({ viewport: DESKTOP });

  test('the menu is never narrower than the trigger that opened it', async ({ overviewPage, envSwitcher }) => {
    await overviewPage.goto('/');

    await envSwitcher.trigger.evaluate((el) => {
      (el as HTMLElement).style.minWidth = '300px';
    });

    await envSwitcher.open();
    await expect(envSwitcher.menu).toBeVisible();

    const trigger = await envSwitcher.trigger.boundingBox();
    const surface = await envSwitcher.surface.boundingBox();
    if (trigger === null || surface === null) throw new Error('env switcher has no bounding box');

    expect(surface.width).toBeGreaterThanOrEqual(trigger.width - 1);
  });
});
