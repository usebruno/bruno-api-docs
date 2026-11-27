import { test, expect } from '../../playwright';

const DESKTOP = { width: 1280, height: 900 };

test.describe('Playground request — inherited headers', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
  });

  test('inherited headers are hidden by default behind a toggle that counts them', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    const { inheritedHeaders } = playground;
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (3)');
    await expect(inheritedHeaders.toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(inheritedHeaders.rows).toHaveCount(0);
    await expect(inheritedHeaders.inheritedSectionToggle).toBeHidden();
  });

  test('showing additional headers lists every inherited header read-only in its own group', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    const { inheritedHeaders } = playground;
    await inheritedHeaders.toggle.click();

    await expect(inheritedHeaders.toggle).toHaveText('Hide Additional Headers');
    await expect(inheritedHeaders.inheritedSectionToggle).toHaveText('Inherited Headers');
    await expect(inheritedHeaders.inheritedSectionToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(inheritedHeaders.requestSectionToggle).toHaveText('Request Headers (0)');
    await expect(inheritedHeaders.rows).toHaveCount(3);
    await expect(inheritedHeaders.row('collection-header')).toContainText('collection-header-value');
    await expect(inheritedHeaders.row('X-Billing-Account')).toContainText('acct_billing_folder');
    await expect(inheritedHeaders.row('X-Tenant-Id')).toContainText('tenant_customers_folder');
    await expect(inheritedHeaders.checkbox('X-Tenant-Id')).toBeChecked();
    await expect(inheritedHeaders.checkbox('X-Tenant-Id')).toBeDisabled();
    await expect(inheritedHeaders.sourceLink('collection-header')).toHaveAccessibleName(
      'collection-header: Inherited from collection: Bruno Testbench'
    );
    await expect(inheritedHeaders.sourceLink('X-Billing-Account')).toHaveAccessibleName(
      'X-Billing-Account: Inherited from folder: billing'
    );
    await expect(inheritedHeaders.sourceLink('X-Tenant-Id')).toHaveAccessibleName(
      'X-Tenant-Id: Inherited from folder: customers'
    );
  });

  test('each group collapses on its own and hiding then showing re-expands the inherited group', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    const { inheritedHeaders, keyValueTable } = playground;
    await inheritedHeaders.toggle.click();

    await inheritedHeaders.inheritedSectionToggle.click();
    await expect(inheritedHeaders.inheritedSectionToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(inheritedHeaders.rows).toHaveCount(0);
    await expect(keyValueTable.nameInputs).toHaveCount(1);

    await inheritedHeaders.requestSectionToggle.click();
    await expect(inheritedHeaders.requestSectionToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(keyValueTable.nameInputs).toHaveCount(0);

    await inheritedHeaders.toggle.click();
    await expect(inheritedHeaders.inheritedSectionToggle).toBeHidden();
    await expect(keyValueTable.nameInputs).toHaveCount(1);

    await inheritedHeaders.toggle.click();
    await expect(inheritedHeaders.inheritedSectionToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(inheritedHeaders.rows).toHaveCount(3);
  });

  test('the nearest folder wins and an own header hides the inherited one', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'invoices', 'Get All Invoices']);
    await playground.selectTab('headers');

    const { inheritedHeaders } = playground;
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (1)');
    await inheritedHeaders.toggle.click();

    await expect(inheritedHeaders.rows).toHaveCount(1);
    await expect(inheritedHeaders.row('collection-header')).toContainText('invoices-folder-header-value');
    await expect(inheritedHeaders.sourceLink('collection-header')).toHaveAccessibleName(
      'collection-header: Inherited from folder: invoices'
    );
    await expect(inheritedHeaders.row('X-Billing-Account')).toBeHidden();
    await expect(inheritedHeaders.requestSectionToggle).toHaveText('Request Headers (1)');
  });

  test('a folder source link opens that folder settings on its Headers tab', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    await playground.inheritedHeaders.toggle.click();
    await playground.inheritedHeaders.sourceLink('X-Tenant-Id').click();
    await expect(playground.viewTitle).toHaveText('customers');
    await expect(playground.folderSettingsTab('headers')).toHaveAttribute('aria-selected', 'true');
  });

  test('a collection source link opens the collection settings on its Headers tab', async ({
    playground,
    collectionSettings
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    await playground.inheritedHeaders.toggle.click();
    await playground.inheritedHeaders.sourceLink('collection-header').click();
    await expect(collectionSettings.tab('headers')).toHaveAttribute('aria-selected', 'true');
  });

  test('opening a folder from the sidebar after following a source link lands on its Overview tab', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    await playground.inheritedHeaders.toggle.click();
    await playground.inheritedHeaders.sourceLink('X-Billing-Account').click();
    await expect(playground.folderSettingsTab('headers')).toHaveAttribute('aria-selected', 'true');

    await playground.openTreeItem(['billing', 'customers']);
    await expect(playground.viewTitle).toHaveText('customers');
    await expect(playground.folderSettingsTab('overview')).toHaveAttribute('aria-selected', 'true');
  });

  test('adding an own header with the same name hides the inherited one, case-insensitively', async ({
    playground
  }) => {
    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await playground.selectTab('headers');

    const { keyValueTable, inheritedHeaders } = playground;
    await inheritedHeaders.toggle.click();
    await keyValueTable.nameInputs.last().fill('x-tenant-id');
    await expect(keyValueTable.nameInputs.nth(-2)).toHaveValue('x-tenant-id');
    await keyValueTable.valueInputs.nth(-2).fill('own-tenant');

    await expect(inheritedHeaders.row('X-Tenant-Id')).toBeHidden();
    await expect(inheritedHeaders.rows).toHaveCount(2);

    await inheritedHeaders.toggle.click();
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (2)');
  });

  test('the Headers tab counts only own headers', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'invoices', 'Get All Invoices']);
    await playground.selectTab('headers');

    await expect(playground.tab('headers')).toHaveText('Headers1');
  });
});

test.describe('Folder settings — inherited headers', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
  });

  test('a top-level folder inherits only the collection headers', async ({ playground }) => {
    await playground.openTreeItem(['billing']);
    await playground.folderSettingsTab('headers').click();

    const { inheritedHeaders, keyValueTable } = playground;
    await expect(keyValueTable.nameInputs.first()).toHaveValue('X-Billing-Account');
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (1)');
    await inheritedHeaders.toggle.click();

    await expect(inheritedHeaders.rows).toHaveCount(1);
    await expect(inheritedHeaders.row('collection-header')).toContainText('collection-header-value');
    await expect(inheritedHeaders.sourceLink('collection-header')).toHaveAccessibleName(
      'collection-header: Inherited from collection: Bruno Testbench'
    );
  });

  test('a nested folder inherits from the collection and its parent folder, read-only', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers']);
    await playground.folderSettingsTab('headers').click();

    const { inheritedHeaders } = playground;
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (2)');
    await inheritedHeaders.toggle.click();

    await expect(inheritedHeaders.rows).toHaveCount(2);
    await expect(inheritedHeaders.row('collection-header')).toBeVisible();
    await expect(inheritedHeaders.row('X-Billing-Account')).toContainText('acct_billing_folder');
    await expect(inheritedHeaders.checkbox('X-Billing-Account')).toBeChecked();
    await expect(inheritedHeaders.checkbox('X-Billing-Account')).toBeDisabled();
    await expect(inheritedHeaders.row('X-Tenant-Id')).toBeHidden();
  });

  test('a folder header overrides the inherited one with the same name', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'invoices']);
    await playground.folderSettingsTab('headers').click();

    const { inheritedHeaders } = playground;
    await expect(inheritedHeaders.toggle).toHaveText('Show Additional Headers (1)');
    await inheritedHeaders.toggle.click();

    await expect(inheritedHeaders.rows).toHaveCount(1);
    await expect(inheritedHeaders.row('X-Billing-Account')).toBeVisible();
    await expect(inheritedHeaders.row('collection-header')).toBeHidden();
  });

  test('a folder source link opens that folder settings on its Headers tab', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers']);
    await playground.folderSettingsTab('headers').click();

    await playground.inheritedHeaders.toggle.click();
    await playground.inheritedHeaders.sourceLink('X-Billing-Account').click();
    await expect(playground.viewTitle).toHaveText('billing');
    await expect(playground.folderSettingsTab('headers')).toHaveAttribute('aria-selected', 'true');
  });

  test('adding a folder header with the same name hides the inherited one', async ({ playground }) => {
    await playground.openTreeItem(['billing', 'customers']);
    await playground.folderSettingsTab('headers').click();

    const { keyValueTable, inheritedHeaders } = playground;
    await inheritedHeaders.toggle.click();
    await keyValueTable.nameInputs.last().fill('x-billing-account');
    await expect(keyValueTable.nameInputs.nth(-2)).toHaveValue('x-billing-account');
    await keyValueTable.valueInputs.nth(-2).fill('own-account');

    await expect(inheritedHeaders.row('X-Billing-Account')).toBeHidden();
    await expect(inheritedHeaders.rows).toHaveCount(1);
  });
});
