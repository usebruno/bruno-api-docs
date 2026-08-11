import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import type { CodeEditorComponent } from '../../components/code-editor/code-editor.component';

const RES_TESTS_SCRIPT = `
test('res exposes the status code, statusText, headers, and parsed body as direct properties', function () {
  expect(res.status).to.equal(200);
  expect(res.statusText).to.be.a('string');
  expect(res.headers['content-type']).to.contain('application/json');
  expect(res.body.users).to.have.length(2);
});

test('res.getStatus, res.getStatusText, and res.getBody return the status and the parsed body', function () {
  expect(res.getStatus()).to.equal(200);
  expect(res.getStatusText()).to.be.a('string');
  expect(res.getBody().users).to.have.length(2);
});

test('res.getHeader finds a header no matter how it is capitalised, and res.getHeaders returns all of them', function () {
  expect(res.getHeader('Content-Type')).to.contain('application/json');
  expect(res.getHeader('X-TOKEN')).to.equal('abc');
  expect(res.getHeaders()['x-token']).to.equal('abc');
});

test('res exposes the response time and URL as both properties and getter methods', function () {
  expect(res.responseTime).to.be.a('number');
  expect(res.getResponseTime()).to.be.a('number');
  expect(res.url).to.contain('/api/users');
  expect(res.getUrl()).to.contain('/api/users');
});

test('res.getSize reports the header, body, and total sizes as numbers', function () {
  var size = res.getSize();
  expect(size.header).to.be.a('number');
  expect(size.body).to.be.a('number');
  expect(size.total).to.be.at.least(0);
});

test('res.getDataBuffer can be called (the browser has no raw byte buffer, so it is empty)', function () {
  var db = res.getDataBuffer();
  expect(db === undefined || db === null).to.equal(true);
});

test('res can be called to read into the body, with and without a filter function', function () {
  expect(res('users[0].name')).to.equal('Ada');
  var filtered = JSON.stringify(res('users[?].name', function (u) { return u.id === 2; }));
  expect(filtered).to.contain('Lin');
  expect(filtered).to.not.contain('Ada');
});

test('res.headerList reads a single header case-insensitively: get, one, has, indexOf, count', function () {
  expect(res.headerList.get('Content-Type')).to.contain('application/json');
  expect(res.headerList.one('X-Token').value).to.equal('abc');
  expect(res.headerList.has('x-token')).to.equal(true);
  expect(res.headerList.has('x-token', 'abc')).to.equal(true);
  expect(res.headerList.indexOf('X-Token')).to.be.at.least(0);
  expect(res.headerList.count()).to.be.at.least(2);
});

test('res.headerList reads the whole list: all, toObject, toString, toJSON', function () {
  expect(res.headerList.all().length).to.be.at.least(2);
  expect(res.headerList.toObject()['x-token']).to.equal('abc');
  expect(res.headerList.toString()).to.contain('x-token');
  expect(res.headerList.toJSON().length).to.be.at.least(2);
});

test('res.headerList can be iterated: each, map, filter, find, and reduce (map and reduce accept a this value)', function () {
  var keys = [];
  res.headerList.each(function (h) { keys.push(h.key); });
  expect(keys.length).to.be.at.least(2);

  var tagged = res.headerList.map(function (h) { return this.prefix + h.key; }, { prefix: '#' });
  expect(tagged.join(',')).to.contain('#x-token');

  expect(res.headerList.filter(function (h) { return h.key === 'x-token'; }).length).to.equal(1);
  expect(res.headerList.find(function (h) { return h.key === 'x-token'; }).value).to.equal('abc');

  var joined = res.headerList.reduce(function (acc, h) { return acc + h.key + ';'; }, '');
  expect(joined).to.contain('x-token;');
});

test('res.headerList is read-only: add, upsert, remove, clear, populate, repopulate, and assimilate all throw', function () {
  var writes = ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'];
  writes.forEach(function (method) {
    var threw = false;
    try { res.headerList[method]({ key: 'x', value: 'y' }); } catch (e) { threw = true; }
    expect(threw, method + '() should throw').to.equal(true);
  });
});

test('res.setBody replaces the response body, and res.getBody returns the new value', function () {
  res.setBody({ replaced: true });
  expect(res.getBody().replaced).to.equal(true);
});
`;

const HIDDEN_HEADER_SCRIPT = `
test('a header the server sends but does not CORS-expose is hidden by the browser and reads back empty on res', function () {
  expect(res.body.users).to.have.length(1);
  expect(res.getHeader('content-type')).to.contain('application/json');
  expect(res.getHeader('x-token') == null).to.equal(true);
  expect(res.headers['x-token'] === undefined).to.equal(true);
  expect(res.headerList.has('x-token')).to.equal(false);
  expect(res.headerList.get('x-token') == null).to.equal(true);
  expect(res.headerList.one('x-token') == null).to.equal(true);
});
`;

const setEditorScript = async (page: Page, editor: CodeEditorComponent, script: string): Promise<void> => {
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(script);
};

test.describe('The res object available to scripts (end-to-end in the playground)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-token': 'abc',
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'x-token, content-type'
        },
        body: JSON.stringify({ users: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }] })
      })
    );
  });

  test('every res method and property runs in a tests script with no failures', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, RES_TESTS_SCRIPT);

    await responsePane.send();
    await responsePane.switchToTab('tests');

    await expect(page.getByText(/Passed: [1-9]\d*, Failed: 0/).first()).toBeVisible();
    await expect(page.getByText(/Failed: [1-9]/)).toHaveCount(0);
  });

  test('res.setBody in a post-response script replaces the body shown in the response pane', async ({ page, playground, responsePane }) => {
    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');

    await playground.selectTab('scripts');
    await page.getByTestId('scripts-tabs-tab-post-response').click();
    await setEditorScript(page, playground.postResponseScriptEditor, `res.setBody({ marker: 'hey there' });`);

    await responsePane.send();

    await expect(responsePane.bodyEditor.root).toContainText('marker');
    await expect(responsePane.bodyEditor.root).toContainText('there');
    await expect(responsePane.bodyEditor.root).not.toContainText('Ada');
  });

  test('a custom header sent without access-control-expose-headers is hidden by the browser', async ({ page, playground, responsePane }) => {
    await page.unroute('**/api/users**');
    await page.route('**/api/users**', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-token': 'abc',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify({ users: [{ id: 1, name: 'Ada' }] })
      })
    );

    await page.goto('/#/?pg=1&dock=bottom');
    await playground.openSidebarItem('get users');
    await playground.selectTab('tests');
    await setEditorScript(page, playground.testsEditor, HIDDEN_HEADER_SCRIPT);

    await responsePane.send();
    await responsePane.switchToTab('tests');

    await expect(page.getByText(/Passed: [1-9]\d*, Failed: 0/).first()).toBeVisible();
    await expect(page.getByText(/Failed: [1-9]/)).toHaveCount(0);
  });
});
