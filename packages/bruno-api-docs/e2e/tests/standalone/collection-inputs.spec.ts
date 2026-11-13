import { dump } from 'js-yaml';
import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const YAML = dump(generalFixtureCollection);
const BROKEN_YAML = 'key: [unclosed';
const COLLECTION_URL = 'https://collections.example.com/general.yml';

test.describe('Collection inputs accepted by Bruno.apiDocs', () => {
  test.beforeEach(async ({ standalonePage }) => {
    await standalonePage.goto();
  });

  test('a YAML string renders the collection', async ({ standalonePage, pageHeader, sidebar }) => {
    await standalonePage.mount('first', { content: YAML });

    await expect(pageHeader.brandName).toHaveText('General Fixture');
    await expect(sidebar.items).toHaveText(['GETAlpha', 'GETBeta']);
  });

  test('a JSON string renders the collection', async ({ standalonePage, pageHeader, sidebar }) => {
    await standalonePage.mount('first', { content: JSON.stringify(generalFixtureCollection) });

    await expect(pageHeader.brandName).toHaveText('General Fixture');
    await expect(sidebar.items).toHaveText(['GETAlpha', 'GETBeta']);
  });

  test('an unparseable string throws from Bruno.apiDocs and leaves the target empty', async ({ standalonePage }) => {
    await expect(standalonePage.mount('first', { content: BROKEN_YAML }))
      .rejects.toThrow('Invalid collection format: Failed to parse YAML: unexpected end of the stream within a flow collection');

    await expect(standalonePage.target('first')).toBeEmpty();
  });

  test('a string that parses to a plain YAML scalar renders an empty untitled collection', async ({
    standalonePage,
    pageHeader,
    overviewPage,
    sidebar
  }) => {
    await standalonePage.mount('first', { content: 'just words' });

    await expect(pageHeader.brandName).toHaveText('API Collection');
    await expect(overviewPage.header.collectionName).toHaveText('Untitled Collection');
    await expect(sidebar.items).toHaveCount(0);
  });

  test('a File renders the collection', async ({ standalonePage, pageHeader, sidebar }) => {
    await standalonePage.mountFile('first', YAML, 'general.yml');

    await expect(pageHeader.brandName).toHaveText('General Fixture');
    await expect(sidebar.items).toHaveText(['GETAlpha', 'GETBeta']);
  });

  test('an unparseable File shows the parse error in the target', async ({ standalonePage }) => {
    await standalonePage.mountFile('first', BROKEN_YAML, 'broken.yml');

    await expect(standalonePage.target('first')).toHaveText('Error: Failed to parse collection as YAML or JSON');
  });

  test('a URL string shows Loading while the collection is fetched, then renders it', async ({
    page,
    standalonePage,
    pageHeader,
    sidebar
  }) => {
    let respond!: () => void;
    const responded = new Promise<void>((resolve) => { respond = resolve; });
    await page.route(COLLECTION_URL, async (route) => {
      await responded;
      await route.fulfill({ status: 200, body: YAML });
    });

    await standalonePage.mount('first', { content: COLLECTION_URL });
    await expect(standalonePage.target('first')).toHaveText('Loading...');

    respond();

    await expect(pageHeader.brandName).toHaveText('General Fixture');
    await expect(sidebar.items).toHaveText(['GETAlpha', 'GETBeta']);
  });

  test('a URL that answers 404 shows the fetch error in the target', async ({ page, standalonePage }) => {
    await page.route(COLLECTION_URL, (route) => route.fulfill({ status: 404, body: 'nope' }));

    await standalonePage.mount('first', { content: COLLECTION_URL });

    await expect(standalonePage.target('first')).toHaveText('Error: Failed to fetch collection: Not Found');
  });
});
