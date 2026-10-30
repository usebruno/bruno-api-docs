import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';
import { appConfig } from '../../config/app.config';

const SLOW_URL = `${appConfig.testServerURL}/delay?ms=10000`;
const SCRIPT_HOST = 'https://from-script.example.com';

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('cancelling an in-flight playground request', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.urlInput.fill(SLOW_URL);
    await expect(playground.urlInput).toHaveValue(SLOW_URL);
  });

  test('a running request shows a live timer and can be cancelled from the response pane', async ({ responsePane }) => {
    await responsePane.send();

    await expect(responsePane.stopwatch).toHaveText(/^\d+\.\ds$/);
    await expect(responsePane.loadingText).toHaveText('Sending request...');
    const firstReading = await responsePane.stopwatch.innerText();
    await expect(responsePane.stopwatch).not.toHaveText(firstReading);

    await responsePane.cancelButton.click();

    await expect(responsePane.loadingView).toBeHidden();
    await expect(responsePane.emptyHint).toBeVisible();
    await expect(responsePane.sendButton).toBeEnabled();
  });

  test('the Send button turns into Cancel while the request runs', async ({ responsePane }) => {
    await responsePane.send();

    await expect(responsePane.sendButton).toBeHidden();
    await expect(responsePane.queryBarCancelButton).toBeVisible();
    await responsePane.queryBarCancelButton.click();

    await expect(responsePane.queryBarCancelButton).toBeHidden();
    await expect(responsePane.sendButton).toBeVisible();
    await expect(responsePane.emptyHint).toBeVisible();
  });

  test('cancelling after the server replied still shows the response and keeps the script\'s variable changes', async ({
    page,
    playground,
    responsePane
  }) => {
    await playground.urlInput.fill(`${appConfig.testServerURL}/echo?host={{host}}`);
    await playground.selectTab('scripts');
    await playground.selectScriptTab('post-response');
    await setEditorScript(
      page,
      playground.postResponseScriptEditor,
      `bru.setEnvVar('host', '${SCRIPT_HOST}'); await bru.sleep(3000);`
    );

    const replied = page.waitForResponse(`${appConfig.testServerURL}/echo**`);
    await responsePane.send();
    await replied;
    await responsePane.cancelButton.click();
    await expect(responsePane.loadingView).toBeHidden();

    await expect(responsePane.status).toContainText('200', { timeout: 10000 });
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText(SCRIPT_HOST);
  });

  test('a cancelled send that finishes after a newer send does not replace the newer response', async ({
    page,
    playground,
    responsePane
  }) => {
    await playground.urlInput.fill(`${appConfig.testServerURL}/echo?run=first`);
    await playground.selectTab('scripts');
    await playground.selectScriptTab('post-response');
    await setEditorScript(
      page,
      playground.postResponseScriptEditor,
      `if (res.getBody().query.run === 'first') await bru.sleep(3000);`
    );

    const replied = page.waitForResponse(`${appConfig.testServerURL}/echo**`);
    await responsePane.send();
    await replied;
    await responsePane.cancelButton.click();
    await expect(responsePane.loadingView).toBeHidden();

    await playground.urlInput.fill(`${appConfig.testServerURL}/echo?run=second`);
    await responsePane.send();
    await expect(responsePane.status).toContainText('200');
    await expect.poll(() => responsePane.bodyText()).toContain('"run": "second"');

    await page.waitForTimeout(3500);
    expect(await responsePane.bodyText()).toContain('"run": "second"');
  });

  test('a second send shows the overlay over the first response, and cancelling it brings that response back', async ({
    playground,
    responsePane
  }) => {
    await playground.urlInput.fill(`${appConfig.testServerURL}/echo`);
    await responsePane.send();
    await expect(responsePane.status).toContainText('200');

    await playground.urlInput.fill(SLOW_URL);
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();
    await expect(responsePane.bodyPanel).toBeVisible();

    await responsePane.switchToTab('headers');
    await expect(responsePane.loadingView).toBeVisible();
    await responsePane.switchToTab('response');
    await responsePane.cancelButton.click();

    await expect(responsePane.loadingView).toBeHidden();
    await expect(responsePane.status).toContainText('200');
    await expect.poll(() => responsePane.bodyText()).toContain('"method": "GET"');
  });

  test('opening another request while one is running does not show the loading view there', async ({
    playground,
    responsePane
  }) => {
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();

    await playground.openRequest('echo json');

    await expect(responsePane.loadingView).toBeHidden();
    await expect(responsePane.sendButton).toBeVisible();
    await expect(responsePane.emptyHint).toBeVisible();
  });

  test('a request keeps running after opening another one, and shows its timer and Cancel on the way back', async ({
    playground,
    responsePane
  }) => {
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();

    await playground.openRequest('echo json');
    await expect(responsePane.loadingView).toBeHidden();

    await playground.openRequest('get users');
    await expect(responsePane.stopwatch).toBeVisible();
    await responsePane.cancelButton.click();
    await expect(responsePane.loadingView).toBeHidden();
  });

  test('a request that finishes while another view is open shows its response on the way back', async ({
    page,
    playground,
    responsePane
  }) => {
    const slowUrl = `${appConfig.testServerURL}/delay?ms=2000`;
    await playground.urlInput.fill(slowUrl);
    const replied = page.waitForResponse(slowUrl);
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();

    await playground.openEnvironments();
    await replied;

    await playground.openRequest('get users');
    await expect(responsePane.status).toContainText('200');
  });

  test('closing the playground while a request is running stops the request', async ({
    page,
    playground,
    responsePane
  }) => {
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();

    const aborted = page.waitForEvent('requestfailed', (request) => request.url() === SLOW_URL);
    await playground.close();

    expect((await aborted).failure()).toEqual({ errorText: 'net::ERR_ABORTED' });
  });

  test('cancelling while a pre-request script is still running clears the loading view and drops the script\'s changes', async ({
    page,
    playground,
    responsePane
  }) => {
    await playground.urlInput.fill(`${appConfig.testServerURL}/echo?host={{host}}`);
    await playground.variable.hoverInputToken('host');
    const originalHost = await playground.variable.value.innerText();

    await playground.selectTab('scripts');
    await setEditorScript(
      page,
      playground.preRequestScriptEditor,
      `bru.setEnvVar('host', '${SCRIPT_HOST}'); await bru.sleep(3000);`
    );
    await responsePane.send();
    await expect(responsePane.loadingView).toBeVisible();

    await responsePane.cancelButton.click();

    await expect(responsePane.loadingView).toBeHidden({ timeout: 1000 });
    await expect(responsePane.emptyHint).toBeVisible();
    await expect(responsePane.sendButton).toBeEnabled();

    await page.waitForTimeout(3500);
    await playground.variable.hoverInputToken('host');
    await expect(playground.variable.value).toHaveText(originalHost);
  });
});
