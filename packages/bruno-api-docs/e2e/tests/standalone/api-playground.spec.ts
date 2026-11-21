import { dump } from 'js-yaml';
import { test, expect } from '../../playwright';
import { appConfig } from '../../config/app.config';

const PROD_HOST = 'https://api.prod.example.com';
const COLLECTION_URL = 'https://collections.example.com/playground.yml';
const SCRIPT_HEADER = 'pre-request';

type Target = 'first' | 'second';

const collection = {
  opencollection: '1.0.0',
  info: { name: 'Playground Only' },
  config: {
    environments: [
      { name: 'Local', variables: [{ name: 'host', value: appConfig.testServerURL }] },
      { name: 'Prod', variables: [{ name: 'host', value: PROD_HOST }] }
    ]
  },
  items: [
    {
      info: { name: 'Echo', type: 'http' },
      http: { method: 'GET', url: '{{host}}/echo' },
      runtime: { scripts: [{ type: 'before-request', code: `req.setHeader('x-from-script', '${SCRIPT_HEADER}');` }] }
    },
    { info: { name: 'Other', type: 'http' }, http: { method: 'POST', url: '{{host}}/other' } }
  ]
};

const swapped = {
  opencollection: '1.0.0',
  info: { name: 'Swapped' },
  items: [{ info: { name: 'Ping', type: 'http' }, http: { method: 'GET', url: `${appConfig.testServerURL}/echo` } }]
};

test.use({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });

test.describe('Bruno.apiPlayground from api-playground.js', () => {
  test.beforeEach(async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.goto();
  });

  test('renders only the playground, with no docs code requested', async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');

    await expect(first.root).toBeVisible();
    await expect(first.treeItems).toHaveText(['GETEcho', 'POSTOther']);
    await expect(first.docsShell).toHaveCount(0);
    await expect(first.dockHeader).toHaveCount(0);
    await expect(apiPlaygroundPage.target('second')).toBeEmpty();
    expect(await apiPlaygroundPage.brunoKeys()).toEqual(['apiPlayground', 'build']);
    expect(apiPlaygroundPage.scriptRequests).toEqual(['/api-playground.js']);
  });

  test('sends the picked request with its pre-request script applied, and never touches the host URL', async ({
    page,
    apiPlaygroundPage
  }) => {
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');

    await first.treeItem('Echo').click();
    const sent = page.waitForRequest(`${appConfig.testServerURL}/echo`);
    await first.responsePane.send();

    expect((await sent).headers()['x-from-script']).toBe(SCRIPT_HEADER);
    await expect(first.responsePane.status).toHaveText('200 OK');
    expect(page.url()).toBe(apiPlaygroundPage.url());
    expect(apiPlaygroundPage.scriptRequests).toEqual(['/api-playground.js']);
  });

  test('sends the edited URL', async ({ page, apiPlaygroundPage }) => {
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');
    await first.treeItem('Echo').click();

    await first.urlInput.fill(`${appConfig.testServerURL}/echo?edited=1`);
    const sent = page.waitForRequest(`${appConfig.testServerURL}/echo?edited=1`);
    await first.responsePane.send();

    expect((await sent).method()).toBe('GET');
    await expect(first.responsePane.status).toHaveText('200 OK');
  });

  test('switching the environment sends to that environment\'s host', async ({ page, apiPlaygroundPage }) => {
    await apiPlaygroundPage.forwardToEcho(PROD_HOST);
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');
    await first.treeItem('Echo').click();

    await first.envSwitcher.selectEnvironment('Prod');
    const sent = page.waitForRequest(`${PROD_HOST}/echo`);
    await first.responsePane.send();

    expect((await sent).url()).toBe(`${PROD_HOST}/echo`);
    await expect(first.envSwitcher.trigger).toHaveText('Prod');
    await expect(first.responsePane.status).toHaveText('200 OK');
  });

  test('updateCollection swaps the collection in place', async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');
    await expect(first.treeItems).toHaveText(['GETEcho', 'POSTOther']);

    await apiPlaygroundPage.updateCollection('first', swapped);

    await expect(first.treeItems).toHaveText(['GETPing']);
  });

  test('destroy empties the target', async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.mount('first', collection);
    await expect(apiPlaygroundPage.instance('first').root).toBeVisible();

    await apiPlaygroundPage.destroy('first');

    await expect(apiPlaygroundPage.target('first')).toBeEmpty();
  });

  test('destroy aborts its own in-flight request, before its after-response script, and leaves a sibling\'s alone', async ({
    page,
    apiPlaygroundPage
  }) => {
    const slowUrl = (id: Target, ms: number) => `${appConfig.testServerURL}/delay?ms=${ms}&id=${id}`;
    const slow = (id: Target, ms: number) => ({
      opencollection: '1.0.0',
      info: { name: `Slow ${id}` },
      items: [
        {
          info: { name: 'Slow', type: 'http' },
          http: { method: 'GET', url: slowUrl(id, ms) },
          runtime: { scripts: [{ type: 'after-response', code: `console.log('after-response ${id}');` }] }
        }
      ]
    });
    await apiPlaygroundPage.mount('first', slow('first', 1500));
    await apiPlaygroundPage.mount('second', slow('second', 2500));
    const first = apiPlaygroundPage.instance('first');
    const second = apiPlaygroundPage.instance('second');
    await first.treeItem('Slow').click();
    await second.treeItem('Slow').click();

    const firstSent = page.waitForRequest(slowUrl('first', 1500));
    await first.responsePane.send();
    await firstSent;
    const secondSent = page.waitForRequest(slowUrl('second', 2500));
    await second.responsePane.send();
    await secondSent;
    const aborted = page.waitForEvent('requestfailed', (request) => request.url() === slowUrl('first', 1500));
    await apiPlaygroundPage.destroy('first');

    expect((await aborted).failure()).toEqual({ errorText: 'net::ERR_ABORTED' });
    await expect(second.responsePane.status).toHaveText('200 OK');
    expect(apiPlaygroundPage.consoleLogs).toContain('after-response second');
    expect(apiPlaygroundPage.consoleLogs).not.toContain('after-response first');
  });

  test('a URL string is fetched and rendered', async ({ page, apiPlaygroundPage }) => {
    await page.route(COLLECTION_URL, (route) => route.fulfill({ status: 200, body: dump(collection) }));

    await apiPlaygroundPage.mount('first', COLLECTION_URL);

    await expect(apiPlaygroundPage.instance('first').treeItems).toHaveText(['GETEcho', 'POSTOther']);
  });

  test('two instances keep their own selection and edits', async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.mount('first', collection);
    await apiPlaygroundPage.mount('second', collection);
    const first = apiPlaygroundPage.instance('first');
    const second = apiPlaygroundPage.instance('second');

    await first.treeItem('Echo').click();
    await first.urlInput.fill('https://edited.example.com/echo');
    await second.treeItem('Echo').click();

    await expect(second.urlInput).toHaveValue('{{host}}/echo');
    await expect(first.urlInput).toHaveValue('https://edited.example.com/echo');

    await second.treeItem('Other').click();

    await expect(second.urlInput).toHaveValue('{{host}}/other');
    await expect(first.urlInput).toHaveValue('https://edited.example.com/echo');
  });
});

test.describe('Bruno.apiPlayground next to Bruno.apiDocs', () => {
  test('works from api-docs.js, loading the playground view and not api-playground.js', async ({
    page,
    apiPlaygroundPage
  }) => {
    await apiPlaygroundPage.goto('index.html');
    await apiPlaygroundPage.mount('first', collection);
    const first = apiPlaygroundPage.instance('first');

    await first.treeItem('Echo').click();
    await first.responsePane.send();

    await expect(first.responsePane.status).toHaveText('200 OK');
    await expect(first.docsShell).toHaveCount(0);
    expect(apiPlaygroundPage.scriptRequests).toEqual([
      '/api-docs.js',
      expect.stringMatching(/^\/playground-view-[\w-]+\.js$/)
    ]);
    expect(page.url()).toBe(apiPlaygroundPage.url('index.html'));
  });

  test('loading both bundles keeps every entry and the build on Bruno', async ({ apiPlaygroundPage }) => {
    await apiPlaygroundPage.goto();
    await apiPlaygroundPage.addApiDocsScript();

    expect(await apiPlaygroundPage.brunoKeys()).toEqual(['apiDocs', 'apiPlayground', 'build']);

    await apiPlaygroundPage.mountDocs('first', collection);
    await apiPlaygroundPage.mount('second', collection);

    await expect(apiPlaygroundPage.instance('first').docsShell).toBeVisible();
    await expect(apiPlaygroundPage.instance('second').treeItems).toHaveText(['GETEcho', 'POSTOther']);
  });
});
