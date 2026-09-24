import type { Locator, Page, Route } from '@playwright/test';
import { test, expect } from '../../playwright';

const VARS_PLAYGROUND = '/?fixture=vars#/?pg=1&dock=bottom';

test.describe('Playground prompt variables', () => {
  test.beforeEach(async ({ page, playground }) => {
    await page.goto(VARS_PLAYGROUND);
    await playground.runner.waitFor({ state: 'visible' });
    await playground.openTreeItem(['Customers', 'Variables Demo']);
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');
  });

  const armRequest = async (page: Page, urlInput: Locator, url: string) => {
    const sent: string[] = [];
    await page.route('**/*', async (route: Route) => {
      const target = route.request().url();
      if (target.startsWith('http') && !target.includes('127.0.0.1') && !target.includes('localhost')) {
        sent.push(target);
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    await urlInput.fill(url);
    await expect(urlInput).toHaveValue(url);
    return sent;
  };

  test('asks for a value before sending and interpolates what the reader typed', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();

    const dialog = page.getByTestId('prompt-variables-modal-content');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Input Required')).toBeVisible();

    await page.getByTestId('prompt-variable-input-0').fill('123456');
    await page.getByTestId('prompt-variables-submit').click();

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => sent).toContain('https://api.example.com/otp/123456');
  });

  test('submits on Enter, so the reader never has to reach for the mouse', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();
    await expect(page.getByTestId('prompt-variables-modal-content')).toBeVisible();

    await page.keyboard.type('654321');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('prompt-variables-modal-content')).toHaveCount(0);
    await expect.poll(() => sent).toContain('https://api.example.com/otp/654321');
  });

  test('asks again on the next send, because answers are never kept', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();
    await page.getByTestId('prompt-variable-input-0').fill('111111');
    await page.getByTestId('prompt-variables-submit').click();
    await expect.poll(() => sent.length).toBe(1);

    await responsePane.send();

    const dialog = page.getByTestId('prompt-variables-modal-content');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('prompt-variable-input-0')).toHaveValue('');

    await page.getByTestId('prompt-variable-input-0').fill('222222');
    await page.getByTestId('prompt-variables-submit').click();
    await expect.poll(() => sent).toContain('https://api.example.com/otp/222222');
  });

  test('sends nothing when the reader backs out', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();
    await page.getByTestId('prompt-variables-cancel').click();

    await expect(page.getByTestId('prompt-variables-modal-content')).toHaveCount(0);
    await expect(responsePane.emptyHint).toBeVisible();
    expect(sent).toEqual([]);
  });

  test('closes on Escape without sending', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();
    await expect(page.getByTestId('prompt-variables-modal-content')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('prompt-variables-modal-content')).toHaveCount(0);
    await expect(responsePane.emptyHint).toBeVisible();
    expect(sent).toEqual([]);
  });

  test('puts the cursor in the first field so the reader can type straight away', async ({ page, playground, responsePane }) => {
    await armRequest(page, playground.urlInput, 'https://api.example.com/{{?First}}/{{?Second}}');

    await responsePane.send();
    await expect(page.getByTestId('prompt-variables-modal-content')).toBeVisible();

    await page.keyboard.type('typed-without-clicking');
    await expect(page.getByTestId('prompt-variable-input-0')).toHaveValue('typed-without-clicking');
  });

  test('asks for one field per prompt and sends both answers', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/{{?First}}/{{?Second}}');

    await responsePane.send();

    await expect(page.getByTestId('prompt-variable-input-container')).toHaveCount(2);
    await page.getByTestId('prompt-variable-input-0').fill('one');
    await page.getByTestId('prompt-variable-input-1').fill('two');
    await page.getByTestId('prompt-variables-submit').click();

    await expect.poll(() => sent).toContain('https://api.example.com/one/two');
  });

  test('sends an empty string for a field left blank, rather than the token', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/otp/{{?OTP}}');

    await responsePane.send();
    await page.getByTestId('prompt-variables-submit').click();

    await expect.poll(() => sent).toContain('https://api.example.com/otp/');
  });

  test('sends without asking when the request uses no prompt variables', async ({ page, playground, responsePane }) => {
    const sent = await armRequest(page, playground.urlInput, 'https://api.example.com/plain');

    await responsePane.send();

    await expect.poll(() => sent).toContain('https://api.example.com/plain');
    await expect(page.getByTestId('prompt-variables-modal-content')).toHaveCount(0);
  });
});
