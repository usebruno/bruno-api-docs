import { test, expect } from '../../../playwright';

// A small JSON object. Served as application/json so the pane decodes it as JSON rather
// than sniffing it as plain text.
const BODY = '{"hello":"world","nested":{"count":2}}';
const EDITED = 'edited-by-test';

const ALL_FORMATS = ['json', 'html', 'xml', 'javascript', 'raw', 'hex', 'base64'] as const;

test.describe('response formats — JSON', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: BODY
      })
    );
  });

  test('defaults to the prettified JSON source view and offers every decoder', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // application/json lands on the JSON editor (source), not the preview, and is pretty-printed.
    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toContain('"hello": "world"');

    // A textual body isn't a byte format, so all seven decoders are selectable and preview is off.
    await responsePane.openFormatSelector();
    for (const format of ALL_FORMATS) {
      await expect(responsePane.formatOption(format)).toBeVisible();
    }
    expect(await responsePane.isPreviewOn()).toBe(false);
  });

  test('source view pretty-prints the JSON across indented lines', async ({
    page,
    playground,
    responsePane
  }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await expect(responsePane.bodyEditorCanvas).toBeVisible();

    // fastJsonFormat expands the object over multiple indented lines rather than the single-line
    // wire format, with the nested object opened on its own.
    const text = await responsePane.bodyText();
    expect(text.split('\n').length).toBeGreaterThan(1);
    expect(text).toContain('"nested": {');
    expect(text).toContain('"count": 2');
  });

  test('source view is read-only and ignores typed input', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await responsePane.bodyEditor.focus();
    await page.keyboard.type(EDITED);

    // The response editor is read-only, so the body is unchanged by the keystrokes.
    await expect.poll(() => responsePane.bodyText()).toContain('"hello": "world"');
    expect(await responsePane.bodyText()).not.toContain(EDITED);
  });

  test('renders an interactive JSON tree in preview', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(true);

    // The tree replaces the Monaco editor and surfaces the keys and values.
    await expect(responsePane.jsonPreview).toBeVisible();
    await expect(responsePane.bodyEditorCanvas).toHaveCount(0);
    await expect(responsePane.jsonPreview).toContainText('hello');
    await expect(responsePane.jsonPreview).toContainText('world');
  });
});
