import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const ALPHA_URL = '{{host}}/alpha?q={{special}}&m={{onlyInDev}}&t={{apiToken}}';
const EDITED_URL = 'https://edited.example.com/alpha';

test.describe('updateCollection after playground edits', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ standalonePage, requestPage, envSwitcher, playground }) => {
    await standalonePage.goto();
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await requestPage.sidebar.item('Alpha').click();
    await envSwitcher.selectEnvironment('Prod');
    await requestPage.urlBar.tryButton.click();
    await playground.view.waitFor({ state: 'visible' });
    await playground.urlInput.fill(EDITED_URL);
  });

  test('the same collection again empties the open playground request but keeps the URL, docs page and environment', async ({
    page,
    standalonePage,
    requestPage,
    envSwitcher,
    playground
  }) => {
    await expect(playground.urlInput).toHaveValue(EDITED_URL);

    await standalonePage.updateCollection('first', generalFixtureCollection);

    await expect(playground.view.getByText('Select an endpoint from the sidebar to get started.')).toBeVisible();
    await expect(playground.urlInput).toHaveCount(0);
    await expect(page).toHaveURL(standalonePage.url('#/alpha?pg=1&dock=bottom&pgReq=alpha'));
    await expect(requestPage.title).toHaveText('Alpha');
    await expect(envSwitcher.trigger).toHaveText('Prod');
    await expect(playground.envSwitcher.trigger).toHaveText('Prod');
  });

  test('the edit is dropped: reopening the request shows the collection\'s URL', async ({
    standalonePage,
    playground
  }) => {
    await expect(playground.urlInput).toHaveValue(EDITED_URL);

    await standalonePage.updateCollection('first', generalFixtureCollection);
    await playground.openRequest('Alpha');

    await expect(playground.urlInput).toHaveValue(ALPHA_URL);
  });
});
