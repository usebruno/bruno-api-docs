import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';
import type { RequestPage } from '../../pages/request.page';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const markPageLoad = (page: Page) => page.evaluate(() => {
  (window as unknown as { __sameLoad: boolean }).__sameLoad = true;
});

const isSamePageLoad = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sameLoad?: boolean }).__sameLoad === true);

const closeAndReopen = async (page: Page, playground: PlaygroundComponent, requestPage: RequestPage): Promise<void> => {
  await markPageLoad(page);
  await playground.close();
  await expect(playground.header).toHaveCount(0);
  await requestPage.urlBar.tryButton.click();
  await expect(playground.header).toBeVisible();
  await playground.view.waitFor({ state: 'visible' });
  expect(await isSamePageLoad(page)).toBe(true);
};

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('Playground edits survive closing and reopening, not a reload', () => {
  test.beforeEach(async ({ page, requestPage, playground }) => {
    await page.goto('/?fixture=vars');
    await requestPage.sidebar.open(['Customers', 'Variables Demo']);
    await requestPage.root.waitFor({ state: 'visible' });
    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');
  });

  test('a typed secret environment value is still set after close and reopen', async ({
    page,
    playground,
    requestPage
  }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.editTo('typed-secret');
    await expect(playground.variable.value).toHaveText('*'.repeat('typed-secret'.length));

    await closeAndReopen(page, playground, requestPage);

    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.revealToggle.click();
    await expect(playground.variable.value).toHaveText('typed-secret');
  });

  test('an edited environment value and request URL are kept after close and reopen', async ({
    page,
    playground,
    requestPage
  }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.editTo('https://edited.example.com');
    await expect(playground.variable.value).toHaveText('https://edited.example.com');

    await playground.urlInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type('&edited=1');
    await expect(playground.urlInput).toHaveValue(/&edited=1$/);

    await closeAndReopen(page, playground, requestPage);

    await expect(playground.urlInput).toHaveValue(/&edited=1$/);
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://edited.example.com');
  });

  test('an edit made in the Environments view is kept after close and reopen', async ({
    page,
    playground,
    requestPage,
    envEditor
  }) => {
    const envTable = playground.keyValueTable;
    await playground.openEnvironments();
    await envEditor.selectEnvironment('Dev');
    await expect(envTable.nameInputs.first()).toHaveValue('host');
    await envTable.valueInputs.first().fill('https://from-env-view.example.com');

    await closeAndReopen(page, playground, requestPage);

    await playground.openEnvironments();
    await envEditor.selectEnvironment('Dev');
    await expect(envTable.valueInputs.first()).toHaveValue('https://from-env-view.example.com');
  });

  test('a folder settings edit is kept after close and reopen', async ({ page, playground, requestPage }) => {
    await playground.openTreeItem(['Customers']);
    await playground.folderSettingsTab('variables').click();
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('folderScope');
    await playground.preRequestVars.valueInputs.first().fill('edited-folder');

    await closeAndReopen(page, playground, requestPage);

    await playground.openTreeItem(['Customers']);
    await playground.folderSettingsTab('variables').click();
    await expect(playground.preRequestVars.valueInputs.first()).toHaveValue('edited-folder');
  });

  test('a collection settings edit is kept after close and reopen', async ({
    page,
    playground,
    requestPage,
    collectionSettings
  }) => {
    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('variables');
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('apiVersion');
    await playground.preRequestVars.valueInputs.first().fill('2099-01');

    await closeAndReopen(page, playground, requestPage);

    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('variables');
    await expect(playground.preRequestVars.valueInputs.first()).toHaveValue('2099-01');
  });

  test('a value set by a script with bru.setEnvVar is kept after close and reopen', async ({
    page,
    playground,
    requestPage,
    responsePane
  }) => {
    await page.route('**/customers/**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' })
    );

    await playground.selectTab('scripts');
    await playground.selectScriptTab('post-response');
    await setEditorScript(
      page,
      playground.postResponseScriptEditor,
      'bru.setEnvVar(\'host\', \'https://from-script.example.com\');'
    );
    await responsePane.send();

    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://from-script.example.com');

    await closeAndReopen(page, playground, requestPage);

    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://from-script.example.com');
  });

  test('a reload restores the collection\'s original values', async ({ page, playground }) => {
    await playground.variable.hoverInputToken('unsetSecret');
    await playground.variable.editTo('typed-secret');
    await expect(playground.variable.value).toHaveText('*'.repeat('typed-secret'.length));
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.name).toHaveText('host');
    await playground.variable.editTo('https://edited.example.com');
    await expect(playground.variable.value).toHaveText('https://edited.example.com');

    await page.reload();
    await playground.runner.waitFor({ state: 'visible' });
    await playground.openTreeItem(['Customers', 'Variables Demo']);
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');

    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://api.dev.example.com');
    await playground.variable.hoverInputToken('unsetSecret');
    await expect(playground.variable.name).toHaveText('unsetSecret');
    await expect(playground.variable.value).toHaveText('');
  });
});
