import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const REQ_TESTS_SCRIPT = `
test('req read methods return the right types', function () {
  expect(req.getUrl()).to.be.a('string');
  expect(req.getMethod()).to.be.a('string');
  expect(req.getHost()).to.be.a('string');
  expect(req.getPath()).to.be.a('string');
  expect(req.getQueryString()).to.be.a('string');
  expect(req.getAuthMode()).to.be.a('string');
  expect(req.getHeaders()).to.be.an('object');
  expect(Array.isArray(req.getPathParams())).to.equal(true);
  expect(Array.isArray(req.getTags())).to.equal(true);
});

test('req.getUrl reflects the request URL', function () {
  expect(req.getUrl()).to.contain('/api/users');
});

test('req.headerList reads the header list: all, toObject, toString, count', function () {
  expect(Array.isArray(req.headerList.all())).to.equal(true);
  expect(req.headerList.toObject()).to.be.an('object');
  expect(req.headerList.toString()).to.be.a('string');
  expect(req.headerList.count()).to.be.at.least(0);
});

test('req.setHeader and req.headerList add/remove a header, readable via getHeader and has', function () {
  req.setHeader('X-Script', 'yes');
  expect(req.getHeader('X-Script')).to.equal('yes');
  req.headerList.add('X-Added', '1');
  expect(req.headerList.has('x-added')).to.equal(true);
  req.headerList.remove('x-added');
  expect(req.headerList.has('x-added')).to.equal(false);
});

test('req.headerList iterators run their callbacks across the sandbox', function () {
  expect(Array.isArray(req.headerList.map(function (h) { return h.key; }))).to.equal(true);
  var count = 0;
  req.headerList.each(function () { count++; });
  expect(count).to.equal(req.headerList.count());
});
`;

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('The req object available to scripts (end-to-end in the playground)', () => {
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

  test('every req method and the writable headerList run in a tests script with no failures', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, REQ_TESTS_SCRIPT);

    await responsePane.send();
    await responsePane.switchToTab('tests');

    await expect(page.getByText(/Passed: [1-9]\d*, Failed: 0/).first()).toBeVisible();
    await expect(page.getByText(/Failed: [1-9]/)).toHaveCount(0);
  });

  test('an unsupported req method surfaces a warning in the response pane instead of silently doing nothing', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, [
      'req.setMaxRedirects(5);',
      'req.onFail(function (err) { return err; });'
    ].join('\n'));

    await responsePane.send();

    const banner = page.getByTestId('warning-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
    await expect(banner).toContainText(
      'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    );
  });
});
