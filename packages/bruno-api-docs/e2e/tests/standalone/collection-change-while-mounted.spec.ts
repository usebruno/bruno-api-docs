import { test, expect } from '../../playwright';
import { generalFixtureCollection, generalOneEnvCollection } from '../../../src/e2eFixtures/generalCollection';

const renamedGeneral = { ...generalFixtureCollection, info: { name: 'Renamed', version: '2.0.0' } };

test.describe('A different collection passed while mounted', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.describe('with the docs on a request page', () => {
    test.beforeEach(async ({ standalonePage, sidebar, envSwitcher }) => {
      await standalonePage.goto();
      await standalonePage.mount('first', { content: generalFixtureCollection });
      await sidebar.item('Beta').click();
      await envSwitcher.selectEnvironment('Prod');
    });

    test('a collection that still has the page keeps the page and environment and shows the new name', async ({
      page,
      standalonePage,
      pageHeader,
      requestPage,
      sidebar,
      envSwitcher
    }) => {
      await standalonePage.updateCollection('first', renamedGeneral);

      await expect(pageHeader.brandName).toHaveText('Renamed');
      await expect(requestPage.title).toHaveText('Beta');
      await expect(sidebar.active).toHaveText('GETBeta');
      await expect(envSwitcher.trigger).toHaveText('Prod');
      await expect(page).toHaveURL(standalonePage.url('#/beta'));
    });

    test('a collection without the page sends the docs to the overview and picks its first environment', async ({
      page,
      standalonePage,
      overviewPage,
      sidebar,
      envSwitcher
    }) => {
      await standalonePage.updateCollection('first', generalOneEnvCollection);

      await expect(overviewPage.root).toBeVisible();
      await expect(sidebar.items).toHaveText(['GETPing']);
      await expect(envSwitcher.trigger).toHaveText('Staging');
      await expect(page).toHaveURL(standalonePage.url('#/'));
      expect(await page.evaluate(() => sessionStorage.getItem('oc-docs.env')))
        .toBe(JSON.stringify({ activeEnvName: 'Staging', showVars: false }));
    });

    test('going back to the first collection does not bring back its earlier environment', async ({
      standalonePage,
      pageHeader,
      envSwitcher
    }) => {
      await standalonePage.updateCollection('first', generalOneEnvCollection);
      await expect(envSwitcher.trigger).toHaveText('Staging');

      await standalonePage.updateCollection('first', generalFixtureCollection);

      await expect(pageHeader.brandName).toHaveText('General Fixture');
      await expect(envSwitcher.trigger).toHaveText('Dev');
    });
  });

  test.describe('with the playground open on a request', () => {
    test.beforeEach(async ({ standalonePage, playground }) => {
      await standalonePage.goto('#/?pg=1&dock=bottom');
      await standalonePage.mount('first', { content: generalFixtureCollection });
      await playground.openRequest('Beta');
    });

    test('the playground stays open with no request selected, its URL unchanged', async ({
      page,
      standalonePage,
      playground
    }) => {
      await expect(playground.urlInput).toHaveValue('{{host}}/beta');

      await standalonePage.updateCollection('first', renamedGeneral);

      await expect(playground.view.getByText('Select an endpoint from the sidebar to get started.')).toBeVisible();
      await expect(playground.treeItems).toHaveText(['GETAlpha', 'GETBeta']);
      await expect(page).toHaveURL(standalonePage.url('#/?pg=1&dock=bottom&pgReq=beta'));
    });

    test('the playground tree lists the new collection\'s requests', async ({ page, standalonePage, playground }) => {
      await expect(playground.urlInput).toHaveValue('{{host}}/beta');

      await standalonePage.updateCollection('first', generalOneEnvCollection);

      await expect(playground.treeItems).toHaveText(['GETPing']);
      await expect(playground.view.getByText('Select an endpoint from the sidebar to get started.')).toBeVisible();
      await expect(page).toHaveURL(standalonePage.url('#/?pg=1&dock=bottom&pgReq=beta'));
    });
  });
});
