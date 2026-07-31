import { test, expect } from '../../playwright';

const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];

test.describe('Playground method selector', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
  });

  test('offers the nine standard methods in the app order, then "+ Add Custom"', async ({ playground }) => {
    expect(await playground.methodSelector.optionIds()).toEqual([...STANDARD_METHODS, 'add-custom']);
  });

  test('selects TRACE and marks it as the chosen row', async ({ playground }) => {
    await playground.methodSelector.select('TRACE');
    await expect(playground.methodSelector.trigger).toHaveText('TRACE');

    await playground.methodSelector.open();
    await expect(playground.methodSelector.option('TRACE')).toHaveAttribute('aria-selected', 'true');
  });

  test('spells the method out in full, unlike the abbreviated sidebar', async ({ playground }) => {
    await playground.methodSelector.select('DELETE');
    await expect(playground.methodSelector.trigger).toHaveText('DELETE');
    await expect(playground.sidebarItem('get users').locator('.navlink-method')).toHaveText('DEL');

    await playground.methodSelector.select('CONNECT');
    await expect(playground.methodSelector.trigger).toHaveText('CONNECT');
    await expect(playground.sidebarItem('get users').locator('.navlink-method')).toHaveText('CON');
  });

  test('keeps TRACE unabbreviated in the sidebar', async ({ playground }) => {
    await playground.methodSelector.select('TRACE');
    await expect(playground.sidebarItem('get users').locator('.navlink-method')).toHaveText('TRACE');
  });

  test('abbreviates a custom method only when it is longer than five characters', async ({ playground }) => {
    const badge = playground.sidebarItem('get users').locator('.navlink-method');

    await playground.methodSelector.enterCustom('PURGE');
    await expect(badge).toHaveText('PURGE');

    await playground.methodSelector.enterCustom('PROPFIND');
    await expect(badge).toHaveText('PRO');
  });

  test.describe('custom method', () => {
    test('accepts a typed method, upper-casing it, and ticks no row', async ({ playground }) => {
      await playground.methodSelector.enterCustom('purge');
      await expect(playground.methodSelector.trigger).toHaveText('PURGE');

      await playground.methodSelector.open();
      await expect(playground.methodSelector.selectedOption).toHaveCount(0);
    });

    test('opens an empty field so typing replaces the current method', async ({ playground }) => {
      await playground.methodSelector.startCustom('');
      await expect(playground.methodSelector.customInput).toHaveValue('');
    });

    test('discards the entry on Escape', async ({ playground }) => {
      await playground.methodSelector.select('PATCH');
      await playground.methodSelector.startCustom('REPORT');
      await playground.methodSelector.customInput.press('Escape');

      await expect(playground.methodSelector.trigger).toHaveText('PATCH');
    });

    test('keeps the previous method when the field is left empty', async ({ playground }) => {
      await playground.methodSelector.select('PUT');
      await playground.methodSelector.startCustom('');
      await playground.header.click();

      await expect(playground.methodSelector.trigger).toHaveText('PUT');
    });

    test('keeps the previous method when Enter is pressed on an empty field', async ({ playground }) => {
      await playground.methodSelector.select('PUT');
      await playground.methodSelector.startCustom('');
      await playground.methodSelector.customInput.press('Enter');

      await expect(playground.methodSelector.trigger).toHaveText('PUT');
    });

    test('trims a padded method so it stays a valid HTTP method', async ({ playground }) => {
      await playground.methodSelector.enterCustom('  purge  ');

      await expect(playground.methodSelector.trigger).toHaveText('PURGE');
      await expect(playground.methodSelector.trigger).toHaveAttribute('title', 'PURGE');
    });

    test('returns focus to the trigger after committing with Enter', async ({ playground }) => {
      await playground.methodSelector.startCustom('REPORT');
      await playground.methodSelector.customInput.press('Enter');

      await expect(playground.methodSelector.trigger).toBeFocused();
    });

    test('returns focus to the trigger after Escape', async ({ playground }) => {
      await playground.methodSelector.startCustom('REPORT');
      await playground.methodSelector.customInput.press('Escape');

      await expect(playground.methodSelector.trigger).toBeFocused();
    });

    // A pointer exit has already chosen where focus goes; taking it back would
    // move the caret out of whatever the reader just clicked.
    for (const [label, typed] of [['a typed', 'REPORT'], ['an empty', '']]) {
      test(`leaves focus alone when ${label} field is clicked away from`, async ({ page, playground }) => {
        await playground.methodSelector.startCustom(typed);
        await page.getByTestId('query-bar-url').click();

        await expect(playground.methodSelector.trigger).not.toBeFocused();
      });
    }

    test('shows a long method in full via the title, clipped on screen', async ({ playground }) => {
      await playground.methodSelector.enterCustom('LONG_NOTE_METHOD_NAME');

      await expect(playground.methodSelector.trigger).toHaveAttribute('title', 'LONG_NOTE_METHOD_NAME');
      const clipped = await playground.methodSelector.trigger.evaluate((button) => {
        const badge = button.querySelector('.method-badge') as HTMLElement;
        return badge.scrollWidth > badge.clientWidth;
      });
      expect(clipped).toBe(true);
    });
  });

  // The browser refuses these before connecting and says why, so its wording must
  // reach the reader instead of the generic CORS text used for network failures.
  test.describe('sending a method the browser forbids', () => {
    for (const method of ['TRACE', 'CONNECT']) {
      test(`surfaces the browser's own explanation for ${method}`, async ({ page, playground }) => {
        await playground.methodSelector.select(method);
        await page.getByRole('button', { name: 'Send' }).click();

        await expect(page.getByTestId('error-banner')).toBeVisible();
        await expect(page.getByTestId('error-message')).toContainText(method);
        await expect(page.getByTestId('error-message')).not.toContainText('CORS');
      });
    }
  });
});
