import { test, expect } from '../../playwright';

test.describe('Folder page', () => {
  test('displays the folder name and how many requests it contains', async ({ folderPage }) => {
    await folderPage.open(['Realtime']);
    await expect(folderPage.title).toHaveText('Realtime');
    await expect(folderPage.requestCount).toHaveText('10 requests');
  });

  test('shows config inherited from the collection even when the folder has no own config', async ({ folderPage }) => {
    await folderPage.open(['Realtime']);
    await expect(folderPage.configuration.root).toBeVisible();
    await expect(folderPage.emptyState).toBeHidden();

    await test.step('inherited headers are shown with a count chip and a goto-source link', async () => {
      await expect(folderPage.configuration.headers).toBeVisible();
      await expect(folderPage.configuration.headers).toContainText('collection-header');
      await expect(folderPage.configuration.headers).toContainText('header inherited');
      await expect(folderPage.configuration.headers.getByTestId('inherited-source').first()).toBeVisible();
    });

    await test.step('inherited variables are shown, excluding disabled ones', async () => {
      await expect(folderPage.configuration.vars).toBeVisible();
      await expect(folderPage.configuration.vars).toContainText('collection_pre_var');
      await expect(folderPage.configuration.vars).toContainText('1 var inherited');
      await expect(folderPage.configuration.vars).not.toContainText('collection-var-value');
    });
  });

  test('renders the configuration with inherited auth and folder-level scripts', async ({ folderPage }) => {
    await folderPage.open(['billing']);

    await test.step('the configuration is shown instead of the empty state', async () => {
      await expect(folderPage.configuration.root).toBeVisible();
      await expect(folderPage.emptyState).toBeHidden();
    });

    await test.step('the auth group shows the inherited-from-collection badge', async () => {
      await expect(folderPage.configuration.auth).toBeVisible();
      await expect(folderPage.configuration.auth).toContainText('Inherited from collection');
    });

    await test.step('the script group is shown', async () => {
      await expect(folderPage.configuration.script).toBeVisible();
    });
  });

  test('shows the Tests group when the folder defines folder-scoped tests', async ({ folderPage }) => {
    await folderPage.open(['billing', 'customers']);
    await expect(folderPage.title).toHaveText('customers');
    await expect(folderPage.configuration.tests).toBeVisible();
  });

  test('renders the folder docs as markdown and collapses long content behind a "View more" toggle', async ({
    folderPage
  }) => {
    await folderPage.open(['billing']);

    await test.step('the markdown is rendered with formatting', async () => {
      await expect(folderPage.folderMarkdownDocs).toBeVisible();
      await expect(folderPage.folderMarkdownDocs).toContainText('Endpoints for managing');
      await expect(folderPage.folderMarkdownDocs.locator('strong').first()).toHaveText('customers');
    });

    await test.step('long docs collapse to a preview with a "View more" toggle', async () => {
      await expect(folderPage.folderMarkdownDocsToggle).toHaveText('View more');
      await folderPage.folderMarkdownDocsToggle.click();
      await expect(folderPage.folderMarkdownDocsToggle).toHaveText('View less');
    });
  });
});
