import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const DEV_HOST = 'https://api.dev.example.com';
const PROD_HOST = 'https://api.prod.example.com';

test.use({ viewport: { width: 1280, height: 900 } });

test('the playground uses the environment picked in the header, on first open and after a switch while closed', async ({
  page,
  standalonePage,
  requestPage,
  envSwitcher,
  playground,
  responsePane
}) => {
  await page.route('**/alpha**', (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' })
  );
  await standalonePage.goto();
  await standalonePage.mount('first', { content: generalFixtureCollection });
  await requestPage.sidebar.item('Alpha').click();
  await envSwitcher.selectEnvironment('Prod');

  await requestPage.urlBar.tryButton.click();
  await expect(playground.envSwitcher.trigger).toHaveText('Prod');
  const [toProd] = await Promise.all([page.waitForRequest('**/alpha**'), responsePane.send()]);
  expect(toProd.url()).toMatch(new RegExp(`^${PROD_HOST}/alpha`));

  await playground.close();
  await expect(playground.view).toHaveCount(0);
  await envSwitcher.selectEnvironment('Dev');
  await requestPage.urlBar.tryButton.click();

  await expect(playground.envSwitcher.trigger).toHaveText('Dev');
  const [toDev] = await Promise.all([page.waitForRequest('**/alpha**'), responsePane.send()]);
  expect(toDev.url()).toMatch(new RegExp(`^${DEV_HOST}/alpha`));
});
