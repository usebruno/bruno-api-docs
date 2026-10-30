import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';

const DESKTOP = { width: 1280, height: 900 };
const SCRIPT_PATH = ['billing', 'Script.js'];
const EDITED_SOURCE = 'const edited = "playground-only";';

const REQUIRE_SCRIPT_TESTS = `
const { email } = require('./billing/Script.js');
test('uses the edited Script.js', function () {
  expect(email).to.equal('edited@example.com');
});
`;

const openScript = async (page: Page, playground: PlaygroundComponent): Promise<void> => {
  await page.goto('/#/?pg=1&dock=bottom');
  await playground.openTreeItem(SCRIPT_PATH);
  await playground.scriptFile.waitFor({ state: 'visible' });
};

test.describe('Playground — .js script files', () => {
  test.use({ viewport: DESKTOP });

  test('opens a .js file as its source in a code editor', async ({ page, playground }) => {
    await openScript(page, playground);

    await expect(playground.scriptFileTitle).toHaveText('Script');
    await expect(playground.scriptFileEditor.root).toContainText('user@example.com');
    await expect(playground.scriptFileEditor.root).toContainText('password123');
  });

  test('shows no request controls for a .js file', async ({ page, playground }) => {
    await openScript(page, playground);

    await expect(playground.methodSelector.trigger).toHaveCount(0);
    await expect(playground.urlInput).toHaveCount(0);
    await expect(playground.view.getByTestId('query-bar-send')).toHaveCount(0);
    await expect(playground.view.getByTestId('response-tabs')).toHaveCount(0);
  });

  test('marks the .js file with a JS badge in the sidebar', async ({ page, playground }) => {
    await openScript(page, playground);

    await expect(playground.sidebarItem('Script.js')).toContainText('JS');
  });

  test('keeps an edit while the page is open, and drops it on reload', async ({ page, playground }) => {
    await openScript(page, playground);

    await playground.scriptFileEditor.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(EDITED_SOURCE);
    await expect(playground.scriptFileEditor.root).toContainText('playground-only');

    // Move to another item and back: the edit is still there.
    await playground.collectionRootLink.click();
    await expect(playground.scriptFile).toHaveCount(0);
    await playground.openSidebarItem('Script.js');
    await expect(playground.scriptFileEditor.root).toContainText('playground-only');

    // A reload rebuilds the collection from its source, so the edit is gone.
    await page.reload();
    await playground.scriptFile.waitFor({ state: 'visible' });
    await expect(playground.scriptFileEditor.root).toContainText('user@example.com');
    await expect(playground.scriptFileEditor.root).not.toContainText('playground-only');
  });

  test('a request script that requires the .js file gets the edited code on Send', async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(JSON.stringify({ users: [] }));
    await openScript(page, playground);
    await playground.scriptFileEditor.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('module.exports = { email: \'edited@example.com\' };');

    await playground.openSidebarItem('get users');
    await playground.selectTab('tests');
    await playground.testsEditor.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(REQUIRE_SCRIPT_TESTS);
    await responsePane.send();

    await responsePane.switchToTab('tests');
    await expect(responsePane.testsPanel.getByText('Tests (1), Passed: 1, Failed: 0')).toBeVisible();
  });
});
