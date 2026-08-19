import { test, expect } from '../../../playwright';

// A small XML document. Served as application/xml so the pane decodes it as XML.
const BODY
  = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<note><to>Tove</to><from>Jani</from><heading>Reminder</heading></note>';

test.describe('response formats — XML', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/xml' },
        body: BODY
      })
    );
  });

  test('defaults to the formatted XML source view', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    // application/xml lands on the XML editor (source), not the preview.
    await expect(responsePane.bodyEditorCanvas).toBeVisible();
    await expect.poll(() => responsePane.bodyText()).toContain('<note>');
    expect(await responsePane.bodyText()).toContain('<heading>');
    expect(await responsePane.bodyText()).toContain('Reminder');

    // The markup is re-serialized across indented lines, one element per line.
    expect((await responsePane.bodyText()).split('\n').length).toBeGreaterThan(1);

    await responsePane.openFormatSelector();
    expect(await responsePane.isPreviewOn()).toBe(false);
  });

  test('renders an XML tree in preview', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await responsePane.send();

    await responsePane.openFormatSelector();
    await responsePane.togglePreview();
    expect(await responsePane.isPreviewOn()).toBe(true);

    // The tree replaces the Monaco editor and surfaces the element names and their text.
    await expect(responsePane.xmlPreview).toBeVisible();
    await expect(responsePane.bodyEditorCanvas).toHaveCount(0);
    await expect(responsePane.xmlPreview).toContainText('heading');
    await expect(responsePane.xmlPreview).toContainText('Reminder');
  });
});
