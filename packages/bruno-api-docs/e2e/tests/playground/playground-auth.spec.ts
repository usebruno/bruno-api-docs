import { test, expect } from '../../playwright';

const DESKTOP = { width: 1280, height: 900 };

test.describe('Playground request — inherited auth', () => {
  test.use({ viewport: DESKTOP });

  test('the auth dropdown offers Inherit alongside the five supported types, and nothing more', async ({
    playground
  }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.selectTab('auth');

    await playground.auth.open();
    await expect(playground.auth.option('none')).toBeVisible();
    await expect(playground.auth.option('inherit')).toBeVisible();
    await expect(playground.auth.option('basic')).toBeVisible();
    await expect(playground.auth.option('bearer')).toBeVisible();
    await expect(playground.auth.option('apikey')).toBeVisible();
    await expect(playground.auth.option('digest')).toBeVisible();
    // No Auth + Inherit + Basic + Bearer + API Key + Digest — no other auth types are offered.
    await expect(playground.auth.options).toHaveCount(6);
  });

  test('choosing Inherit shows the inherited-auth notice and marks the mode selected', async ({
    playground
  }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.selectTab('auth');

    await playground.auth.selectMode('inherit');
    await expect(playground.auth.modeSelect).toContainText('Inherit');
    await expect(playground.auth.inheritNotice).toBeVisible();
  });

  test('a request already set to inherit opens with Inherit preselected', async ({ playground }) => {
    await playground.open('bottom');
    // Get All Customers inherits its auth from the Bearer-authed collection.
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('auth');

    await expect(playground.auth.modeSelect).toContainText('Inherit');
    await expect(playground.auth.inheritNotice).toBeVisible();
  });
});

test.describe('Playground request — inherited auth source', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
  });

  test('a request inheriting from the collection names it and shows its bearer token read-only', async ({
    playground,
    collectionSettings
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('auth');

    await expect(playground.auth.inheritedSource).toHaveText('Auth inherited from Bruno Testbench Bearer Token');
    await expect(playground.auth.inheritedMode).toHaveAccessibleName('Open Bearer Token auth in Bruno Testbench');
    const token = playground.auth.inheritedField('token');
    await expect(token).toHaveAttribute('readonly', '');
    await expect(token).not.toBeEditable();
    await expect(token).toHaveAttribute('type', 'password');

    await playground.auth.inheritedField('token-toggle').click();
    await expect(token).toHaveAttribute('type', 'text');

    await playground.auth.inheritedMode.click();
    await expect(collectionSettings.tab('overview')).toHaveAttribute('aria-selected', 'true');
  });

  test('a request inheriting from a folder shows its API key read-only with the placement locked', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'invoices', 'Get All Invoices']);
    await playground.selectTab('auth');

    await expect(playground.auth.inheritedSource).toHaveText('Auth inherited from invoices API Key');
    await expect(playground.auth.inheritedField('key')).toHaveValue('X-API-Key');
    await expect(playground.auth.inheritedField('key')).not.toBeEditable();
    await expect(playground.auth.inheritedField('value')).toHaveValue('invoices-folder-api-key');
    await expect(playground.auth.inheritedField('placement')).toHaveText('Header');
    await expect(playground.auth.inheritedField('placement')).toBeDisabled();

    await playground.auth.inheritedMode.click();
    await expect(playground.viewTitle).toHaveText('invoices');
    await expect(playground.folderSettingsTab('overview')).toHaveAttribute('aria-selected', 'true');
  });

  test('switching away from Inherit hides the inherited auth and switching back restores it', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('auth');

    await playground.auth.selectMode('bearer');
    await expect(playground.auth.inheritNotice).toBeHidden();
    await expect(playground.auth.field('token')).toBeEditable();

    await playground.auth.selectMode('inherit');
    await expect(playground.auth.inheritNotice).toBeVisible();
    await expect(playground.auth.inheritedSource).toHaveText('Auth inherited from Bruno Testbench Bearer Token');
  });

  test('the auth mode select sits in the tab row and only on the Auth tab', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('auth');

    await expect(playground.auth.modeSelect).toHaveText('Inherit');
    await expect(playground.auth.panelModeSelect).toHaveCount(0);

    await playground.selectTab('headers');
    await expect(playground.auth.modeSelect).toHaveCount(0);
  });

  test('a folder inheriting its auth links to the collection it inherits from', async ({
    playground,
    collectionSettings
  }) => {
    await playground.openTreeItem(['billing']);
    await playground.folderSettingsTab('auth').click();

    await expect(playground.auth.inheritedSource).toHaveText('Auth inherited from Bruno Testbench Bearer Token');
    await playground.auth.inheritedMode.click();
    await expect(collectionSettings.tab('overview')).toHaveAttribute('aria-selected', 'true');
  });
});
