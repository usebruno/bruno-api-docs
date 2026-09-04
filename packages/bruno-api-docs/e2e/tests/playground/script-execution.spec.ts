import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const LIBRARY_TESTS_SCRIPT = `
const moment = require('moment');
const CryptoJS = require('crypto-js');
const { v4, validate } = require('uuid');
const { nanoid } = require('nanoid');
const tv4 = require('tv4');

test('moment formats a date', function () {
  expect(moment('2026-01-02').format('YYYY-MM-DD')).to.equal('2026-01-02');
});

test('crypto-js hashes and uuid validates', function () {
  expect(CryptoJS.SHA256('abc').toString()).to.equal('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(validate(v4())).to.equal(true);
  expect(nanoid(10)).to.have.lengthOf(10);
});

test('tv4 validates against a schema', function () {
  expect(tv4.validate({ a: 1 }, { type: 'object' })).to.equal(true);
});
`;

const REQUIRE_FS_TESTS_SCRIPT = `
test('ran before the throw', function () { expect(1).to.equal(1); });
require('fs');
test('never reached', function () { expect(1).to.equal(1); });
`;

const UNREACHABLE_HOST_POST_RESPONSE_SCRIPT = `
const axios = require('axios');
await axios.get('https://unreachable.invalid/get');
`;

const REQUIRE_LODASH_PRE_REQUEST_SCRIPT = `
const _ = require('lodash');
`;

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('playground script execution', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('runs a tests script using the safe-mode libraries on Send', async ({ page, playground, responsePane }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify({ users: [{ id: 1, name: 'Ada' }] })
      })
    );

    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, LIBRARY_TESTS_SCRIPT);

    await responsePane.send();
    await responsePane.switchToTab('tests');

    await expect(page.getByText(/Passed: [1-9]\d*, Failed: 0/).first()).toBeVisible();
    await expect(page.getByText(/Failed: [1-9]/)).toHaveCount(0);
  });

  test('a tests script that throws shows a dismissable Test Script Error card and keeps the tests that ran', async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(JSON.stringify({ users: [] }));

    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, REQUIRE_FS_TESTS_SCRIPT);

    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    await expect(responsePane.scriptErrors.getByTestId('error-title')).toHaveText('Test Script Error');
    await expect(responsePane.scriptErrors.getByTestId('error-message')).toContainText('\'fs\' is a Node.js builtin');

    await responsePane.switchToTab('tests');
    await expect(responsePane.testsPanel.getByText('Tests (2), Passed: 1, Failed: 1')).toBeVisible();
    await expect(responsePane.testsPanel.getByText('ran before the throw')).toBeVisible();
    await expect(responsePane.testsPanel.getByText('never reached')).toHaveCount(0);
    await expect(responsePane.testsScriptErrors.getByTestId('error-title')).toHaveText('Test Script Error');

    await responsePane.testsScriptErrorsDismiss.click();
    await expect(responsePane.testsScriptErrors).toHaveCount(0);
    await responsePane.switchToTab('response');
    await expect(responsePane.scriptErrors).toHaveCount(0);
    await expect(responsePane.bodyEditor.surface).toBeVisible();
  });

  test('a pre-request script that throws shows a Pre-Request Script Error card instead of a response', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await playground.selectTab('scripts');
    await setEditorScript(page, playground.preRequestScriptEditor, REQUIRE_LODASH_PRE_REQUEST_SCRIPT);

    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Pre-Request Script Error');
    await expect(responsePane.errorMessage).toContainText('\'lodash\' is only available in the Bruno desktop app\'s developer mode');
    await expect(responsePane.status).toHaveCount(0);
  });

  test('a post-response script that throws shows a Post-Response Script Error card while the body still renders', async ({ page, playground, responsePane }) => {
    await responsePane.mockUsersResponse(JSON.stringify({ users: [] }));
    await page.route('https://unreachable.invalid/**', (route) => route.abort('namenotresolved'));

    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await playground.selectTab('scripts');
    await page.getByTestId('scripts-tabs-tab-post-response').click();
    await setEditorScript(page, playground.postResponseScriptEditor, UNREACHABLE_HOST_POST_RESPONSE_SCRIPT);

    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    await expect(responsePane.scriptErrors.getByTestId('error-title')).toHaveText('Post-Response Script Error');
    await expect(responsePane.scriptErrors.getByTestId('error-message')).toHaveText('Network Error');
    await expect(responsePane.bodyEditor.surface).toBeVisible();

    await responsePane.switchToTab('tests');
    await expect(responsePane.testsPanel.getByText('Tests (1), Passed: 0, Failed: 1')).toBeVisible();
    await expect(responsePane.testsPanel.getByText('Post-Response Script Error').first()).toBeVisible();
  });
});
