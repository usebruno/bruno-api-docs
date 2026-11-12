import { test, expect } from '../../playwright';
import { foldersFixtureCollection } from '../../../src/e2eFixtures/foldersCollection';

type Node = { items?: Node[] } & Record<string, unknown>;

const withUuids = (items: Node[], prefix = 'item'): Node[] =>
  items.map((item, index) => ({
    ...item,
    uuid: `${prefix}-${index}`,
    ...(item.items ? { items: withUuids(item.items, `${prefix}-${index}`) } : {})
  }));

const foldersWithUuids = {
  ...foldersFixtureCollection,
  items: withUuids(foldersFixtureCollection.items as unknown as Node[])
};

test.describe('The playground after updateCollection', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ standalonePage }) => {
    await standalonePage.goto('#/?pg=1&dock=bottom');
  });

  test('a folder opened in the playground tree is closed again when its items carry no uuids', async ({
    standalonePage,
    playground
  }) => {
    await standalonePage.mount('first', { content: foldersFixtureCollection });
    const listRooms = playground.treeItems.filter({ hasText: 'List Rooms' });
    await playground.folderChevron('Rooms').click();
    await expect(listRooms).toHaveCount(1);

    await standalonePage.updateCollection('first', foldersFixtureCollection);

    await expect(playground.treeItems.filter({ hasText: /^Rooms$/ })).toHaveCount(1);
    await expect(listRooms).toHaveCount(0);
  });

  test('a folder opened in the playground tree stays open when its items keep their uuids', async ({
    standalonePage,
    playground
  }) => {
    await standalonePage.mount('first', { content: foldersWithUuids });
    const listRooms = playground.treeItems.filter({ hasText: 'List Rooms' });
    const login = playground.treeItems.filter({ hasText: 'Login' });
    await playground.folderChevron('Rooms').click();
    await expect(listRooms).toHaveCount(1);
    await expect(login).toHaveCount(0);

    await standalonePage.updateCollection('first', foldersWithUuids);

    await expect(listRooms).toHaveCount(1);
    await expect(login).toHaveCount(0);
  });

  test('the open request stays selected when its items keep their uuids', async ({
    standalonePage,
    playground
  }) => {
    await standalonePage.mount('first', { content: foldersWithUuids });
    await playground.folderChevron('Rooms').click();
    await playground.openRequest('List Rooms');
    await expect(playground.urlInput).toHaveValue('{{host}}/rooms');

    await standalonePage.updateCollection('first', foldersWithUuids);

    await expect(playground.urlInput).toHaveValue('{{host}}/rooms');
  });
});
