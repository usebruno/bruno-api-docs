import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';
import type { ResponsePaneComponent } from '../../components/playground/response-pane.component';
import type { StandalonePage } from '../../pages/standalone.page';
import type { PageHeaderComponent } from '../../components/layout/page-header.component';
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

const renamed = <T extends object>(collection: T) => ({ ...collection, info: { name: 'Hotel API 2', version: '1.0.0' } });

const LIST_ROOMS_URL = '{{host}}/rooms';
const NO_REQUEST = 'Select an endpoint from the sidebar to get started.';

interface Fixtures {
  page: Page;
  standalonePage: StandalonePage;
  playground: PlaygroundComponent;
  responsePane: ResponsePaneComponent;
  pageHeader: PageHeaderComponent;
}

const editCloseAndUpdate = async (
  { page, standalonePage, playground, responsePane, pageHeader }: Fixtures,
  content: object
): Promise<void> => {
  await standalonePage.mount('first', { content });
  await playground.folderChevron('Rooms').click();
  await playground.openRequest('List Rooms');
  await playground.folderChevron('Authentication').click();
  await playground.envSwitcher.selectEnvironment('Prod');
  await responsePane.send();
  await expect(responsePane.status).toHaveText('200 OK');
  await playground.urlInput.fill('https://edited.example.com/rooms');
  await playground.close();
  await expect(playground.view).toHaveCount(0);
  await expect(page).toHaveURL(standalonePage.url('#/'));

  await standalonePage.updateCollection('first', renamed(content));
  await expect(pageHeader.brandName).toHaveText('Hotel API 2');
};

const reopenWithoutRequest = (page: Page) =>
  page.evaluate(() => {
    window.location.hash = '#/?pg=1&dock=bottom';
  });

test.describe('updateCollection while the playground is closed, then reopened', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page, standalonePage }) => {
    await page.route('**/rooms**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"r":1}' })
    );
    await standalonePage.goto('#/?pg=1&dock=bottom');
  });

  test.describe('with items that keep their uuids', () => {
    test.beforeEach(async ({ page, standalonePage, playground, responsePane, pageHeader }) => {
      await editCloseAndUpdate(
        { page, standalonePage, playground, responsePane, pageHeader },
        foldersWithUuids
      );
      await reopenWithoutRequest(page);
    });

    test('the request open before closing comes back with its edit dropped and its response kept', async ({
      playground,
      responsePane
    }) => {
      await expect(playground.urlInput).toHaveValue(LIST_ROOMS_URL);
      await expect(responsePane.status).toHaveText('200 OK');
      await expect(playground.envSwitcher.trigger).toHaveText('Prod');
    });

    test('the folders open before closing are still open', async ({ playground }) => {
      await expect(playground.treeItems.filter({ hasText: 'List Rooms' })).toHaveCount(1);
      await expect(playground.treeItems.filter({ hasText: 'Login' })).toHaveCount(1);
      await expect(playground.treeItems.filter({ hasText: 'List Bookings' })).toHaveCount(0);
    });
  });

  test.describe('with items that carry no uuids', () => {
    test.beforeEach(async ({ page, standalonePage, playground, responsePane, pageHeader }) => {
      await editCloseAndUpdate(
        { page, standalonePage, playground, responsePane, pageHeader },
        foldersFixtureCollection
      );
    });

    test('no request is selected and every folder is closed again', async ({ page, playground, responsePane }) => {
      await reopenWithoutRequest(page);

      await expect(playground.view).toHaveText(NO_REQUEST);
      await expect(playground.urlInput).toHaveCount(0);
      await expect(responsePane.status).toHaveCount(0);
      await expect(playground.treeItems.filter({ hasText: 'List Rooms' })).toHaveCount(0);
      await expect(playground.treeItems.filter({ hasText: 'Login' })).toHaveCount(0);
      await expect(playground.envSwitcher.trigger).toHaveText('Prod');
    });

    test('going back to the request link opens it from the new collection, with no response and only its folder open', async ({
      page,
      standalonePage,
      playground,
      responsePane
    }) => {
      await page.goBack();

      await expect(page).toHaveURL(standalonePage.url('#/?pg=1&dock=bottom&pgReq=rooms%2Flist-rooms'));
      await expect(playground.urlInput).toHaveValue(LIST_ROOMS_URL);
      await expect(responsePane.status).toHaveCount(0);
      await expect(playground.treeItems.filter({ hasText: 'List Rooms' })).toHaveCount(1);
      await expect(playground.treeItems.filter({ hasText: 'Login' })).toHaveCount(0);
    });
  });
});
