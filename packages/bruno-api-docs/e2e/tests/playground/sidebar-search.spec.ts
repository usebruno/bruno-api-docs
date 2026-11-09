import { test, expect } from '../../playwright';

const FULL_TREE_ROWS = 14;

test.describe('Playground sidebar search', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await expect(playground.treeItems).toHaveCount(FULL_TREE_ROWS);
  });

  test('filters by name and keeps the folders leading to each match open', async ({ playground }) => {
    await playground.searchInput.fill('auth');

    await expect(playground.treeItems).toHaveText([
      'GraphQL Fixtures',
      '03 Auth And Headers',
      /Bearer Auth Query/,
      /Headers And Params/,
      /No Auth Query/
    ]);
    await expect(playground.folderToggle('GraphQL Fixtures')).toHaveAttribute('aria-label', 'Collapse folder');
    await expect(playground.sidebarItem('03 Auth And Headers').locator('.search-hl')).toHaveText('Auth');
  });

  test('finds requests by URL and shows the URL line only while searching', async ({ playground }) => {
    await playground.searchInput.fill('api/users');

    const getUsers = playground.sidebarItem('get users');
    await expect(getUsers.locator('.navlink-sublabel')).toHaveText('{{host}}/api/users?page=1&limit=10');
    await expect(getUsers.locator('.navlink-sublabel .search-hl')).not.toHaveCount(0);

    await playground.clearSearchButton.click();
    await expect(playground.sidebarPanel.locator('.navlink-sublabel')).toHaveCount(0);
  });

  test('does not show a URL line for requests that matched by name', async ({ playground }) => {
    await playground.searchInput.fill('auth');
    await expect(playground.sidebarItem('Bearer Auth Query')).toBeVisible();
    await expect(playground.sidebarPanel.locator('.navlink-sublabel')).toHaveCount(0);
  });

  test('does not filter until two characters are typed', async ({ playground }) => {
    await playground.searchInput.fill('a');
    await expect(playground.treeItems).toHaveCount(FULL_TREE_ROWS);
  });

  test('shows "No results found" when nothing matches', async ({ playground }) => {
    await playground.searchInput.fill('zzqqxx');
    await expect(playground.sidebarPanel.getByText('No results found')).toBeVisible();
    await expect(playground.treeItems).toHaveCount(0);
  });

  test('the clear button empties the search and restores the full tree', async ({ playground }) => {
    await playground.searchInput.fill('auth');
    await playground.clearSearchButton.click();

    await expect(playground.searchInput).toHaveValue('');
    await expect(playground.clearSearchButton).toBeHidden();
    await expect(playground.treeItems).toHaveCount(FULL_TREE_ROWS);
  });

  test('a subfolder inside a matched folder can be closed and reopened while searching', async ({ playground }) => {
    await playground.searchInput.fill('fixtures');
    const nested = playground.sidebarItem('Bearer Auth Query');
    await expect(nested).toBeVisible();

    await playground.folderToggle('03 Auth And Headers').click();
    await expect(nested).toBeHidden();

    await playground.folderToggle('03 Auth And Headers').click();
    await expect(nested).toBeVisible();
  });

  test('clicking the name of a folder closed during the search reopens it', async ({ playground }) => {
    await playground.searchInput.fill('fixtures');
    await playground.folderToggle('03 Auth And Headers').click();
    await expect(playground.sidebarItem('Bearer Auth Query')).toBeHidden();

    await playground.sidebarItem('03 Auth And Headers').locator('.navlink-main').click();
    await expect(playground.sidebarItem('Bearer Auth Query')).toBeVisible();
  });

  test('a new search reopens folders closed in the previous one', async ({ playground }) => {
    await playground.searchInput.fill('fixtures');
    await playground.folderToggle('03 Auth And Headers').click();
    await expect(playground.sidebarItem('Bearer Auth Query')).toBeHidden();

    await playground.searchInput.fill('fixture');
    await expect(playground.sidebarItem('Bearer Auth Query')).toBeVisible();
  });

  test('closing folders or the collection while searching leaves the saved tree unchanged', async ({ playground }) => {
    await playground.searchInput.fill('fixtures');
    await playground.folderToggle('GraphQL Fixtures').click();
    await playground.collectionCollapseToggle.click();
    await expect(playground.sidebarItem('GraphQL Fixtures')).toBeVisible();

    await playground.clearSearchButton.click();
    await expect(playground.treeItems).toHaveCount(FULL_TREE_ROWS);
    await expect(playground.folderToggle('GraphQL Fixtures')).toHaveAttribute('aria-label', 'Expand folder');
  });

  test('finds a request by a URL edited in the playground', async ({ playground }) => {
    await playground.openRequest('get users');
    await playground.urlInput.fill('{{host}}/api/zebracorn');

    await playground.searchInput.fill('zebracorn');
    await expect(playground.sidebarItem('get users').locator('.navlink-sublabel')).toHaveText('{{host}}/api/zebracorn');
  });
});
