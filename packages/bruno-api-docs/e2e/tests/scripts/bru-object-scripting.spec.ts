import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const BRU_TESTS_SCRIPT = `
test('bru runtime variables round-trip, delete, and deleteAll', function () {
  bru.setVar('token', 'abc');
  expect(bru.getVar('token')).to.equal('abc');
  expect(bru.hasVar('token')).to.equal(true);
  expect(bru.getAllVars().token).to.equal('abc');

  bru.deleteVar('token');
  expect(bru.hasVar('token')).to.equal(false);

  bru.setVar('a', '1');
  bru.setVar('b', '2');
  bru.deleteAllVars();
  expect(bru.getAllVars()).to.deep.equal({});
});

test('bru collection variables round-trip with has/delete helpers', function () {
  expect(bru.getCollectionName()).to.equal('Bruno Testbench');
  expect(bru.getCollectionVar('collection_pre_var')).to.equal('collection_pre_var_value');
  expect(bru.hasCollectionVar('collection_pre_var')).to.equal(true);

  bru.setCollectionVar('cv_e2e', '1');
  expect(bru.getCollectionVar('cv_e2e')).to.equal('1');
  expect(bru.hasCollectionVar('cv_e2e')).to.equal(true);

  bru.deleteCollectionVar('cv_e2e');
  expect(bru.hasCollectionVar('cv_e2e')).to.equal(false);

  bru.setCollectionVar('cv_temp', 'x');
  bru.deleteAllCollectionVars();
  expect(bru.hasCollectionVar('cv_temp')).to.equal(false);
  expect(bru.hasCollectionVar('collection_pre_var')).to.equal(false);
});

test('bru environment variables read, write, and delete in the active env', function () {
  expect(bru.getEnvName()).to.equal('Local');
  expect(bru.hasEnvVar('host')).to.equal(true);
  expect(bru.getEnvVar('host')).to.contain('localhost');
  expect(bru.getAllEnvVars()).to.have.property('host');

  bru.setEnvVar('e2e_env', 'yes');
  expect(bru.getEnvVar('e2e_env')).to.equal('yes');
  expect(bru.hasEnvVar('e2e_env')).to.equal(true);

  bru.deleteEnvVar('e2e_env');
  expect(bru.hasEnvVar('e2e_env')).to.equal(false);
});

test('bru folder, request, and secret variable readers run', function () {
  // Top-level "get users" has no folder/request vars — readers still resolve safely.
  expect(bru.getFolderVar('missing_folder_var')).to.equal(undefined);
  expect(bru.getRequestVar('missing_request_var')).to.equal(undefined);
  expect(bru.getSecretVar('host')).to.contain('localhost');
});

test('bru.interpolate resolves {{var}} from the runtime store', function () {
  bru.setVar('host', 'example.com');
  expect(bru.interpolate('https://{{host}}/api')).to.equal('https://example.com/api');
});

test('bru.utils and bru.isSafeMode run in the sandbox', function () {
  expect(bru.utils.minifyJson('{ "a": 1 }')).to.equal('{"a":1}');
  expect(bru.utils.minifyXml('<a>\\n  <b>1</b>\\n</a>')).to.equal('<a><b>1</b></a>');
  expect(bru.isSafeMode()).to.equal(true);
});

test('bru.sleep, sendRequest, getTestResults, getAssertionResults, and runRequest run', async function () {
  await bru.sleep(1);

  var sent = await bru.sendRequest({
    method: 'GET',
    url: 'http://localhost:8081/api/users'
  });
  expect(sent.status).to.equal(200);
  expect(sent.data.users[0].name).to.equal('Ada');

  var tests = await bru.getTestResults();
  expect(tests).to.be.an('object');
  expect(tests.summary).to.be.an('object');
  expect(Array.isArray(tests.results)).to.equal(true);

  var asserts = await bru.getAssertionResults();
  expect(asserts).to.be.an('object');
  expect(asserts.summary).to.be.an('object');
  expect(Array.isArray(asserts.results)).to.equal(true);

  var missing = await bru.runRequest('__no_such_request__');
  expect(missing).to.be.an('object');
  expect(missing.message).to.be.a('string');
});
`;

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('The bru object available to scripts (end-to-end in the playground)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify({ users: [{ id: 1, name: 'Ada' }] })
      })
    );
  });

  test('bru variable, env, utils and request helpers run in a tests script with no failures', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, BRU_TESTS_SCRIPT);

    await responsePane.send();
    await responsePane.switchToTab('tests');

    await expect(page.getByText(/Passed: [1-9]\d*, Failed: 0/).first()).toBeVisible();
    await expect(page.getByText(/Failed: [1-9]/)).toHaveCount(0);
  });

  test('an out-of-scope bru method surfaces a warning in the response pane instead of silently doing nothing', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, [
      'bru.visualize(\'html\', { content: \'x\' });',
      'bru.clearVisualizations();',
      'bru.cwd();',
      'bru.getProcessEnv();',
      'bru.getOauth2CredentialVar();',
      'bru.resetOauth2Credential();',
      'bru.setNextRequest(\'Next\');',
      'bru.runner.setNextRequest(\'Next\');',
      'bru.runner.skipRequest();',
      'bru.runner.stopExecution();',
      'bru.runner.iterationIndex;',
      'bru.runner.totalIterations;',
      'bru.runner.iterationData.get();',
      'bru.cookies.get();',
      'bru.cookies.jar();',
      'bru.getAllGlobalEnvVars();',
      'bru.hasGlobalEnvVar();',
      'bru.getGlobalEnvVar();',
      'bru.setGlobalEnvVar();',
      'bru.deleteGlobalEnvVar();',
      'bru.deleteAllGlobalEnvVars();'
    ].join('\n'));

    await responsePane.send();

    const banner = page.getByTestId('warning-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      'bru.visualize is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'bru.runner.skipRequest is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'bru.runner.iterationIndex is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'bru.getAllGlobalEnvVars is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'bru.cookies.jar is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'bru.setNextRequest is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
  });
});
