import { test, expect } from '../../playwright';
import { appConfig } from '../../config/app.config';

const ECHO_URL = `${appConfig.testServerURL}/echo?page=1`;

test.describe('what the playground sends over the network', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
  });

  test('collection and request headers both reach the server', async ({ page, playground, responsePane }) => {
    await playground.urlInput.fill(ECHO_URL);
    await expect(playground.urlInput).toHaveValue(ECHO_URL);

    const echoed = page.waitForResponse((response) =>
      response.url().startsWith(`${appConfig.testServerURL}/echo`) && response.request().method() === 'GET');
    await responsePane.send();
    const { headers } = await (await echoed).json();

    expect(headers['collection-header']).toBe('collection-header-value');
    expect(headers['accept']).toBe('application/json');
    await expect(responsePane.status).toContainText('200');
  });
});
