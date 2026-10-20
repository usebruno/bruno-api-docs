import { test, expect } from '../../playwright';
import { appConfig } from '../../config/app.config';

const SLOW_URL = `${appConfig.testServerURL}/delay?ms=10000`;

test.describe('cancelling an in-flight playground request', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.urlInput.fill(SLOW_URL);
    await expect(playground.urlInput).toHaveValue(SLOW_URL);
  });

  test('a running request shows a live timer and can be cancelled from the response pane', async ({ page, responsePane }) => {
    await responsePane.send();

    const stopwatch = page.getByTestId('response-stopwatch');
    await expect(stopwatch).toHaveText(/^\d+\.\ds$/);
    const firstReading = await stopwatch.textContent();
    await expect(stopwatch).not.toHaveText(firstReading ?? '');

    await page.getByTestId('response-cancel-request').click();

    await expect(page.getByTestId('response-loading')).toBeHidden();
    await expect(responsePane.emptyHint).toBeVisible();
    await expect(responsePane.errorBanner).toBeHidden();
    await expect(responsePane.sendButton).toBeEnabled();
  });

  test('the Send button turns into Cancel while the request runs', async ({ page, responsePane }) => {
    await responsePane.send();

    await expect(responsePane.sendButton).toBeHidden();
    await page.getByTestId('query-bar-cancel').click();

    await expect(responsePane.sendButton).toBeVisible();
    await expect(responsePane.emptyHint).toBeVisible();
  });
});
