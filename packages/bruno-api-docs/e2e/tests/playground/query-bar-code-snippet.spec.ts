import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';

const DESKTOP = { width: 1280, height: 900 };
const VARS_PLAYGROUND = '/?fixture=vars#/?pg=1&dock=bottom';

test.describe('Playground query bar — code snippet', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
  });

  test('the query bar offers an icon-only snippet control that opens the snippet modal', async ({ playground }) => {
    await playground.openRequest('get users');

    const { codeSnippet } = playground;
    await expect(codeSnippet.iconTrigger).toBeVisible();
    await expect(codeSnippet.iconTrigger).toHaveAttribute('aria-label', 'Generate Code');
    // Icon only — the code box lives in the modal.
    await expect(codeSnippet.code).toHaveCount(0);

    await codeSnippet.openFromIcon();
    await expect(codeSnippet.modalCode).toContainText('curl');
  });

  test('switches languages inside the modal', async ({ playground }) => {
    await playground.openRequest('get users');
    await playground.codeSnippet.openFromIcon();

    await playground.codeSnippet.selectModalLanguage('python');
    await expect(playground.codeSnippet.modalLanguageTab('python')).toHaveAttribute('aria-selected', 'true');
    await expect(playground.codeSnippet.modalCode).toContainText('requests');
  });

  test('the snippet url substitutes filled path params and keeps unfilled placeholders', async ({
    page,
    playground
  }) => {
    await playground.openRequest('Jokes');
    await playground.codeSnippet.openFromIcon();
    await expect(playground.codeSnippet.modalCode).toContainText('/posts/1');
    await page.keyboard.press('Escape');

    // A fresh `:commentId` segment is a path param with no value yet.
    await playground.urlInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type('/:commentId');

    await playground.codeSnippet.openFromIcon();
    // Empty path params keep their placeholder instead of collapsing.
    await expect(playground.codeSnippet.modalCode).toContainText('/posts/1/:commentId');
  });

  test('the snippet includes headers inherited from the collection and folders', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.codeSnippet.openFromIcon();

    const { modalCode } = playground.codeSnippet;
    await expect(modalCode).toContainText('collection-header-value');
    await expect(modalCode).toContainText('acct_billing_folder');
    await expect(modalCode).toContainText('X-Tenant-Id');
    await expect(modalCode).toContainText('tenant_customers_folder');
  });
});

test.describe('Playground code snippet — Interpolate Variables', () => {
  test.use({ viewport: DESKTOP });

  const openVarsPlayground = async (page: Page, playground: PlaygroundComponent) => {
    await page.goto(VARS_PLAYGROUND);
    await playground.runner.waitFor({ state: 'visible' });
    await playground.openTreeItem(['Customers', 'Variables Demo']);
    await playground.envSwitcher.selectEnvironment('Dev');
  };

  test('the switch resolves variables without closing the playground', async ({ page, playground }) => {
    await openVarsPlayground(page, playground);

    const { codeSnippet } = playground;
    await codeSnippet.openFromIcon();
    // Starts on, as the app's Generate Code does.
    await expect(codeSnippet.modalInterpolate).toBeChecked();
    await expect(codeSnippet.modalCode).toContainText('https://api.dev.example.com/customers/req-42');

    await codeSnippet.modalInterpolate.setChecked(false);
    await expect(codeSnippet.modalCode).toContainText('{{host}}');
  });

  test('an interpolated playground snippet substitutes secrets, as the app does', async ({ page, playground }) => {
    await openVarsPlayground(page, playground);

    const { codeSnippet } = playground;
    await codeSnippet.openFromIcon();
    await expect(codeSnippet.modalCode).toContainText('Bearer super-secret-token');

    await codeSnippet.modalInterpolate.setChecked(false);
    await expect(codeSnippet.modalCode).toContainText('Bearer {{bearer_token}}');
  });

  test('the docs Show vars toggle moves nothing in the playground snippet', async ({ page, playground }) => {
    await openVarsPlayground(page, playground);

    const { codeSnippet } = playground;
    await codeSnippet.openFromIcon();
    await codeSnippet.modalInterpolate.setChecked(false);
    await expect(codeSnippet.modalCode).toContainText('{{host}}');

    // Flip the app-wide toggle behind the dock: the snippet must not react.
    await page.keyboard.press('Escape');
    await playground.envSwitcher.toggle();
    await codeSnippet.openFromIcon();
    await expect(codeSnippet.modalInterpolate).not.toBeChecked();
    await expect(codeSnippet.modalCode).toContainText('{{host}}');
    await expect(codeSnippet.modalCode).not.toContainText('https://api.dev.example.com');
  });
});
