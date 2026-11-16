import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';
import type { RequestPage } from '../../pages/request.page';

const DEV_HOST = 'https://api.dev.example.com';
const ORIGINAL_URL = '{{host}}/customers/{{userId}}?v={{apiVersion}}&k={{vaultKey}}&s={{unsetSecret}}';

const reopenFromDocs = async (requestPage: RequestPage, playground: PlaygroundComponent): Promise<void> => {
  await requestPage.urlBar.tryButton.click();
  await playground.view.waitFor({ state: 'visible' });
};

test.describe('Docs show the loaded collection, not playground edits', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test.beforeEach(async ({ page, requestPage, playground }) => {
    await page.goto('/?fixture=vars');
    await requestPage.sidebar.open(['Customers', 'Variables Demo']);
    await requestPage.root.waitFor({ state: 'visible' });
    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });
    await playground.envSwitcher.selectEnvironment('Dev');
  });

  test('an environment value edited in the Environments view leaves the docs page on the original', async ({
    playground,
    envEditor,
    requestPage
  }) => {
    await playground.openEnvironments();
    await envEditor.selectEnvironment('Dev');
    await expect(playground.keyValueTable.nameInputs.first()).toHaveValue('host');
    await playground.keyValueTable.valueInputs.first().fill('https://from-env-view.example.com');
    await playground.close();

    await requestPage.variableCard.hoverToken('host');
    await expect(requestPage.variableCard.scopeBadge).toHaveText('Environment');
    await expect(requestPage.variableCard.value).toHaveText(DEV_HOST);

    await reopenFromDocs(requestPage, playground);
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://from-env-view.example.com');
  });

  test('an environment value edited in the Environments view leaves the docs Environments page on the original', async ({
    playground,
    envEditor,
    environmentsPage
  }) => {
    await playground.openEnvironments();
    await envEditor.selectEnvironment('Dev');
    await expect(playground.keyValueTable.nameInputs.first()).toHaveValue('host');
    await playground.keyValueTable.valueInputs.first().fill('https://from-env-view.example.com');
    await playground.close();

    await environmentsPage.sidebar.environments.click();
    await environmentsPage.tab('Dev').click();
    await expect(environmentsPage.table.valueOf('host').first()).toHaveText(DEV_HOST);
  });

  test('a variable edited from the playground hover card leaves the docs page on the original', async ({
    playground,
    requestPage
  }) => {
    await playground.variable.hoverInputToken('host');
    await playground.variable.editTo('https://from-card.example.com');
    await expect(playground.variable.value).toHaveText('https://from-card.example.com');
    await playground.close();

    await requestPage.variableCard.hoverToken('host');
    await expect(requestPage.variableCard.value).toHaveText(DEV_HOST);

    await reopenFromDocs(requestPage, playground);
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText('https://from-card.example.com');
  });

  test('a collection variable edited in collection settings leaves the docs page on the original', async ({
    playground,
    collectionSettings,
    requestPage
  }) => {
    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('variables');
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('apiVersion');
    await playground.preRequestVars.valueInputs.first().fill('2099-12');
    await playground.close();

    await requestPage.variableCard.hoverToken('apiVersion');
    await expect(requestPage.variableCard.scopeBadge).toHaveText('Collection');
    await expect(requestPage.variableCard.value).toHaveText('2024-01');

    await reopenFromDocs(requestPage, playground);
    await playground.variable.hoverInputToken('apiVersion');
    await expect(playground.variable.value).toHaveText('2099-12');
  });

  test('a collection variable edited in collection settings resolves in its headers tab', async ({
    playground,
    collectionSettings
  }) => {
    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('variables');
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('apiVersion');
    await playground.preRequestVars.valueInputs.first().fill('2099-12');
    await collectionSettings.openTab('headers');

    await playground.variable.hoverInputToken('apiVersion');
    await expect(playground.variable.scopeBadge).toHaveText('Collection');
    await expect(playground.variable.value).toHaveText('2099-12');
  });

  test('a folder variable edited in folder settings leaves the docs page on the original', async ({
    playground,
    requestPage
  }) => {
    await playground.openTreeItem(['Customers']);
    await playground.folderSettingsTab('variables').click();
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('folderScope');
    await playground.preRequestVars.valueInputs.first().fill('edited-folder');
    await playground.close();

    await requestPage.variableCard.hoverToken('folderScope');
    await expect(requestPage.variableCard.scopeBadge).toHaveText('Folder');
    await expect(requestPage.variableCard.value).toHaveText('from-folder');

    await reopenFromDocs(requestPage, playground);
    await playground.openTreeItem(['Customers']);
    await playground.folderSettingsTab('variables').click();
    await expect(playground.preRequestVars.valueInputs.first()).toHaveValue('edited-folder');
  });

  test('a request variable edited in the playground leaves the docs page on the original', async ({
    playground,
    requestPage
  }) => {
    await playground.selectTab('variables');
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('userId');
    await playground.preRequestVars.valueInputs.first().fill('req-99');
    await playground.close();

    await requestPage.variableCard.hoverToken('userId');
    await expect(requestPage.variableCard.scopeBadge).toHaveText('Request');
    await expect(requestPage.variableCard.value).toHaveText('req-42');

    await reopenFromDocs(requestPage, playground);
    await playground.selectTab('variables');
    await expect(playground.preRequestVars.valueInputs.first()).toHaveValue('req-99');
  });

  test('a request variable edited in the playground leaves the docs page Variables table on the original', async ({
    playground,
    requestPage
  }) => {
    await expect(requestPage.executionContext.variableValue('userId')).toHaveText('req-42');
    await playground.selectTab('variables');
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('userId');
    await playground.preRequestVars.valueInputs.first().fill('req-99');
    await playground.close();

    await expect(requestPage.executionContext.variableValue('userId')).toHaveText('req-42');
  });

  test('a folder variable edited in folder settings leaves the docs folder page on the original', async ({
    playground,
    folderPage
  }) => {
    await playground.openTreeItem(['Customers']);
    await playground.folderSettingsTab('variables').click();
    await expect(playground.preRequestVars.nameInputs.first()).toHaveValue('folderScope');
    await playground.preRequestVars.valueInputs.first().fill('edited-folder');
    await playground.close();

    await folderPage.sidebar.open(['Customers']);
    await folderPage.root.waitFor({ state: 'visible' });
    await expect(folderPage.configuration.varValue('folderScope')).toHaveText('from-folder');
  });

  test('a playground URL edit stays in the playground, and a reload resets both', async ({
    page,
    playground,
    requestPage
  }) => {
    await playground.urlInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type('&edited=1');
    await expect(playground.urlInput).toHaveValue(`${ORIGINAL_URL}&edited=1`);
    await expect(requestPage.urlBar.url).toHaveText(ORIGINAL_URL);
    await playground.close();

    await expect(requestPage.urlBar.url).toHaveText(ORIGINAL_URL);
    await reopenFromDocs(requestPage, playground);
    await expect(playground.urlInput).toHaveValue(`${ORIGINAL_URL}&edited=1`);

    await page.reload();
    await requestPage.root.waitFor({ state: 'visible' });
    await expect(requestPage.urlBar.url).toHaveText(ORIGINAL_URL);
    await expect(playground.urlInput).toHaveValue(ORIGINAL_URL);
  });
});
