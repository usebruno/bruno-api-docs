import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';
import type { PlaygroundComponent } from '../../components/playground.component';

const SCRIPT_AUTHORIZATION = 'Bearer script-token';
const CONFIG_TOKEN = 'config-token';

const TAB_AUTHORIZATION = 'Bearer tab-token';

const SET_AUTHORIZATION_SCRIPT = `req.setHeader('authorization', '${SCRIPT_AUTHORIZATION}');`;
const SET_API_KEY_HEADER_SCRIPT = `req.setHeader('x-api-key', 'script-key');`;

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

const addAuthorizationHeaderRow = async (playground: PlaygroundComponent): Promise<void> => {
  await playground.selectTab('headers');
  const { keyValueTable } = playground;
  const rowIndex = (await keyValueTable.nameInputs.count()) - 1;
  await keyValueTable.nameInputs.nth(rowIndex).fill('Authorization');
  await keyValueTable.valueInputs.nth(rowIndex).fill(TAB_AUTHORIZATION);
};

test.describe('auth header precedence between the Headers tab, the Auth tab and a pre-request script', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ playground, responsePane }) => {
    await responsePane.mockUsersResponse(JSON.stringify({ users: [] }));
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.selectTab('auth');
    await playground.auth.selectMode('bearer');
    await playground.auth.field('token').fill(CONFIG_TOKEN);
  });

  test('a pre-request script that sets Authorization sends the script value instead of the configured bearer token', async ({ page, playground, responsePane }) => {
    await playground.selectTab('scripts');
    await setEditorScript(page, playground.preRequestScriptEditor, SET_AUTHORIZATION_SCRIPT);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(SCRIPT_AUTHORIZATION);
  });

  test('an Authorization row in the Headers tab is overwritten by the configured bearer token, as on desktop', async ({ playground, responsePane }) => {
    await addAuthorizationHeaderRow(playground);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(`Bearer ${CONFIG_TOKEN}`);
  });

  test('a pre-request script overwriting the Headers tab Authorization row wins over both tabs', async ({ page, playground, responsePane }) => {
    await addAuthorizationHeaderRow(playground);
    await playground.selectTab('scripts');
    await setEditorScript(page, playground.preRequestScriptEditor, SET_AUTHORIZATION_SCRIPT);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(SCRIPT_AUTHORIZATION);
  });

  test('with Basic auth configured, a pre-request script Authorization header is overwritten, as on desktop', async ({ page, playground, responsePane }) => {
    await playground.auth.selectMode('basic');
    await playground.auth.field('username').fill('user');
    await playground.auth.field('password').fill('pass');
    await playground.selectTab('scripts');
    await setEditorScript(page, playground.preRequestScriptEditor, SET_AUTHORIZATION_SCRIPT);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`);
  });

  test('with api key auth in header placement, a pre-request script setting that header wins', async ({ page, playground, responsePane }) => {
    await playground.auth.selectMode('apikey');
    await playground.auth.field('key').fill('X-API-Key');
    await playground.auth.field('value').fill('config-key');
    await playground.selectTab('scripts');
    await setEditorScript(page, playground.preRequestScriptEditor, SET_API_KEY_HEADER_SCRIPT);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['x-api-key']).toBe('script-key');
  });

  test('with No Auth selected, the Headers tab Authorization row is sent as typed', async ({ playground, responsePane }) => {
    await playground.auth.selectMode('none');
    await addAuthorizationHeaderRow(playground);

    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(TAB_AUTHORIZATION);
  });

  test('without a competing header the configured bearer token is sent', async ({ responsePane }) => {
    const sent = responsePane.waitForUsersRequest();
    await responsePane.send();
    const request = await sent;

    expect(request.headers()['authorization']).toBe(`Bearer ${CONFIG_TOKEN}`);
  });
});
