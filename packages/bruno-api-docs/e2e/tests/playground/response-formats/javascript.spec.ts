import { test, expect } from '../../../playwright';

// A small script. Served as application/javascript so the pane decodes it as Javascript.
const BODY = 'const greeting = "hello world";\nconsole.log(greeting);\n';

test.describe('response formats — Javascript', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/javascript' },
        body: BODY
      })
    );
  });

  test('defaults to the Javascript source view', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toContain('const greeting');
    // prettier keeps both statements, each on its own line.
    expect(await responsePane.bodyText()).toContain('console.log(greeting)');
    expect((await responsePane.bodyText()).split('\n').length).toBeGreaterThan(1);

    await responsePane.openFormatSelector();
    expect(await responsePane.isPreviewOn()).toBe(false);
  });

  test('renders the script inside the sandboxed web preview iframe', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(true);

    // Javascript previews through the same sandboxed iframe as HTML (preview-web).
    await expect(responsePane.htmlPreview).toBeVisible();
    await expect(responsePane.bodyEditorCanvas).toHaveCount(0);
    await expect(responsePane.htmlPreviewBody().locator('body')).toContainText('const greeting');
  });
});
