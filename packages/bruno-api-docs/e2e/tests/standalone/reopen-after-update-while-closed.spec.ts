import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright';
import { generalFixtureCollection } from '../../../src/e2eFixtures/generalCollection';

const STAGING_HOST = 'https://api.staging.example.com';

const example = (name: string, status: number) => ({
  name,
  request: { method: 'GET', url: 'https://api.example.com/ping' },
  response: { status }
});

const pingWith = (name: string, examples: object[]) => ({
  opencollection: '1.0.0',
  info: { name, version: '1.0.0' },
  items: [{ uuid: 'ping', name: 'Ping', type: 'http', method: 'GET', url: 'https://api.example.com/ping', examples }]
});

const withStaging = {
  ...generalFixtureCollection,
  info: { name: 'Staging Fixture', version: '1.0.0' },
  config: {
    environments: [
      ...generalFixtureCollection.config!.environments!,
      { name: 'Staging', variables: [{ name: 'host', value: STAGING_HOST }] }
    ]
  }
};

const setHash = (page: Page, hash: string) =>
  page.evaluate((next) => {
    window.location.hash = next;
  }, hash);

test.describe('Reopening the playground after updateCollection while it was closed', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('an example link opens that example when an example was added before it', async ({
    page,
    standalonePage,
    playground,
    pageHeader
  }) => {
    await standalonePage.goto('#/?pg=1&dock=bottom');
    await standalonePage.mount('first', { content: pingWith('Examples', [example('OK', 200)]) });
    await playground.exampleToggle('Ping').click();
    await playground.exampleRow('OK').click();
    await expect(playground.exampleViewName).toHaveText('OK');
    const exampleLink = new URL(page.url()).hash;
    await playground.close();
    await expect(playground.view).toHaveCount(0);

    await standalonePage.updateCollection('first', pingWith('Examples 2', [example('Created', 201), example('OK', 200)]));
    await expect(pageHeader.brandName).toHaveText('Examples 2');
    await setHash(page, exampleLink);

    await expect(playground.exampleViewName).toHaveText('OK');
  });

  test('the environment added by the update and picked in the header is the one the playground uses', async ({
    page,
    standalonePage,
    requestPage,
    envSwitcher,
    playground,
    responsePane,
    pageHeader
  }) => {
    await page.route('**/alpha**', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' })
    );
    await standalonePage.goto();
    await standalonePage.mount('first', { content: generalFixtureCollection });
    await requestPage.sidebar.item('Alpha').click();
    await requestPage.urlBar.tryButton.click();
    await expect(playground.envSwitcher.trigger).toHaveText('Dev');
    await playground.close();
    await expect(playground.view).toHaveCount(0);

    await standalonePage.updateCollection('first', withStaging);
    await expect(pageHeader.brandName).toHaveText('Staging Fixture');
    await envSwitcher.selectEnvironment('Staging');
    await requestPage.urlBar.tryButton.click();

    await expect(playground.envSwitcher.trigger).toHaveText('Staging');
    const [sent] = await Promise.all([page.waitForRequest('**/alpha**'), responsePane.send()]);
    expect(sent.url()).toMatch(new RegExp(`^${STAGING_HOST}/alpha`));
    await expect(envSwitcher.trigger).toHaveText('Staging');
  });
});
