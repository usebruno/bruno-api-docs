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
  expect(req.getName()).to.be.a('string');
});

test('req.getUrl and req.getName reflect the open request', function () {
  expect(req.getUrl()).to.contain('/api/users');
  expect(req.getName()).to.equal('get users');
  expect(req.getTags()).to.include('users');
});

test('req.setUrl and req.setMethod write through and are readable back', function () {
  req.setUrl('https://example.com/v2/items?x=1');
  req.setMethod('PATCH');
  expect(req.getUrl()).to.equal('https://example.com/v2/items?x=1');
  expect(req.getMethod()).to.equal('PATCH');
  expect(req.getHost()).to.equal('example.com');
  expect(req.getPath()).to.equal('/v2/items');
  expect(req.getQueryString()).to.equal('x=1');
});

test('req.setHeader, setHeaders, deleteHeader, and deleteHeaders mutate headers', function () {
  req.setHeader('X-Script', 'yes');
  expect(req.getHeader('X-Script')).to.equal('yes');

  req.setHeaders({ 'X-Batch-A': '1', 'X-Batch-B': '2' });
  expect(req.getHeader('X-Batch-A')).to.equal('1');
  expect(req.getHeader('X-Batch-B')).to.equal('2');

  req.deleteHeader('X-Batch-A');
  expect(req.getHeader('X-Batch-A')).to.equal(undefined);

  req.deleteHeaders(['X-Batch-B', 'X-Script']);
  expect(req.getHeader('X-Batch-B')).to.equal(undefined);
  expect(req.getHeader('X-Script')).to.equal(undefined);
});

test('req.setBody and req.getBody round-trip JSON payloads', function () {
  req.setBody({ hello: 'world', n: 2 });
  expect(req.getBody().hello).to.equal('world');
  expect(req.getBody().n).to.equal(2);
  expect(req.getBody({ raw: true })).to.be.a('string');
});

test('req.getTimeout, setTimeout, getExecutionMode, and disableParsingResponseJson run', function () {
  var before = req.getTimeout();
  req.setTimeout(1234);
  expect(req.getTimeout()).to.equal(1234);
  if (before !== undefined && before !== null) {
    req.setTimeout(before);
  }

  expect(req.getExecutionMode()).to.equal('standalone');
  req.disableParsingResponseJson();
});

test('req.headerList reads the header list: all, toObject, toString, toJSON, count', function () {
  expect(Array.isArray(req.headerList.all())).to.equal(true);
  expect(req.headerList.toObject()).to.be.an('object');
  expect(req.headerList.toString()).to.be.a('string');
  expect(Array.isArray(req.headerList.toJSON())).to.equal(true);
  expect(req.headerList.count()).to.be.at.least(0);
});

test('req.headerList add, upsert, remove, has, find, filter, and indexOf', function () {
  req.headerList.add('X-Added', '1');
  expect(req.headerList.has('x-added')).to.equal(true);
  expect(req.headerList.get('X-Added')).to.equal('1');
  expect(req.headerList.one('x-added').value).to.equal('1');

  expect(req.headerList.upsert('x-added', '2')).to.equal(false);
  expect(req.headerList.get('x-added')).to.equal('2');
  expect(req.headerList.upsert('X-New', 'n')).to.equal(true);

  expect(req.headerList.find(function (h) { return h.key === 'x-added'; }).value).to.equal('2');
  expect(req.headerList.filter(function (h) { return h.key === 'x-added'; }).length).to.equal(1);
  expect(req.headerList.indexOf('X-Added')).to.be.at.least(0);

  req.headerList.remove('x-added');
  expect(req.headerList.has('x-added')).to.equal(false);
});

test('req.headerList iterators and reduce run their callbacks across the sandbox', function () {
  req.headerList.add('X-Iter', '1');
  expect(Array.isArray(req.headerList.map(function (h) { return h.key; }))).to.equal(true);
  var count = 0;
  req.headerList.each(function () { count++; });
  expect(count).to.equal(req.headerList.count());
  var summed = req.headerList.reduce(function (acc) { return acc + 1; }, 0);
  expect(summed).to.equal(req.headerList.count());
});

test('req.headerList populate, repopulate, assimilate, and clear rewrite the list', function () {
  req.headerList.repopulate([{ key: 'X-Only', value: '1' }]);
  expect(req.headerList.has('x-only')).to.equal(true);
  expect(req.headerList.count()).to.equal(1);

  req.headerList.populate([{ key: 'X-Pop', value: '2' }, { key: 'X-Only', value: 'ignored' }]);
  expect(req.headerList.has('x-pop')).to.equal(true);
  expect(req.headerList.get('x-only')).to.equal('1');

  req.headerList.assimilate([{ key: 'X-Merged', value: '3' }], true);
  expect(req.headerList.has('x-merged')).to.equal(true);
  expect(req.headerList.has('x-only')).to.equal(false);

  req.headerList.clear();
  expect(req.headerList.count()).to.equal(0);
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
