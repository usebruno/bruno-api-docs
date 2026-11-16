import { test, expect } from '../../playwright';

test.describe('Params tab: bulk edit', () => {
  test.beforeEach(async ({ page, playground }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('Jokes');
    await playground.selectTab('params');
    await expect(playground.pathParams.root).toBeVisible();
  });

  test('bulk edit shows only the query params and adds the typed ones to the URL', async ({ page, playground }) => {
    const toggle = playground.bulkEditToggle;
    await expect(toggle).toHaveText('Bulk edit');

    await toggle.click();
    await expect(toggle).toHaveText('Key/Value edit');
    await expect(playground.pathParams.root).toHaveCount(0);

    await playground.paramsBulkEditor.focus();
    await page.keyboard.type('page: 2');
    await expect(playground.urlInput).toHaveValue(/page=2/);

    await toggle.click();
    await expect(toggle).toHaveText('Bulk edit');
    await expect(playground.pathParams.nameTexts.first()).toHaveText('postId');
    await expect(playground.urlInput).toHaveValue(/:postId/);
  });

  test('switching to another request opens its params in the Key/Value view', async ({ playground }) => {
    const toggle = playground.bulkEditToggle;
    await toggle.click();
    await expect(toggle).toHaveText('Key/Value edit');

    await playground.openSidebarItem('get users');
    await expect(toggle).toHaveText('Bulk edit');

    await playground.openSidebarItem('Jokes');
    await expect(toggle).toHaveText('Bulk edit');
    await expect(playground.pathParams.nameTexts.first()).toHaveText('postId');
  });

  test('a param added in the URL bar shows in bulk edit and survives typing there', async ({ page, playground }) => {
    await playground.bulkEditToggle.click();

    await playground.urlInput.click();
    await playground.urlInput.press('End');
    await playground.urlInput.pressSequentially('?limit=10');

    const editor = playground.paramsBulkEditor;
    await expect(editor.root).toContainText('limit:10');

    await editor.focus();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type('\npage:2');

    await expect(playground.urlInput).toHaveValue(/limit=10/);
    await expect(playground.urlInput).toHaveValue(/page=2/);
  });
});
