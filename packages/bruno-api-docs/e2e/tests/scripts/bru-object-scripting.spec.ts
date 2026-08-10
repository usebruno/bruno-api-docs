import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const BRU_TESTS_SCRIPT = `
test('bru variable stores round-trip', function () {
  bru.setVar('token', 'abc');
  expect(bru.getVar('token')).to.equal('abc');
  expect(bru.hasVar('token')).to.equal(true);
  expect(bru.getAllVars().token).to.equal('abc');
  bru.setCollectionVar('cv', '1');
  expect(bru.getCollectionVar('cv')).to.equal('1');
});

test('bru.interpolate resolves {{var}} from the runtime store', function () {
  bru.setVar('host', 'example.com');
  expect(bru.interpolate('https://{{host}}/api')).to.equal('https://example.com/api');
});

test('bru.utils.minifyJson and bru.isSafeMode run in the sandbox', function () {
  expect(bru.utils.minifyJson('{ "a": 1 }')).to.equal('{"a":1}');
  expect(bru.isSafeMode()).to.equal(true);
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

  test('bru variable, interpolate and utils methods run in a tests script with no failures', async ({ page, playground, responsePane }) => {
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
      'bru.runner.skipRequest();',
      'bru.runner.iterationIndex;',
      'bru.getAllGlobalEnvVars();'
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
  });
});
