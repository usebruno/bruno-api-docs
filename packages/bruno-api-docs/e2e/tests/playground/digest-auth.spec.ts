import { test, expect } from '../../playwright';
import type { PlaygroundComponent } from '../../components/playground.component';

const EXPECTED_AUTHORIZATION
  = /^Digest username="user", realm="digest-lab", nonce="[0-9a-f]{32}", uri="\/api\/users\?page=1&limit=10", response="[0-9a-f]{32}", qop=auth, algorithm=MD5, nc=00000001, cnonce="[0-9a-f]{48}", opaque="deadbeef"$/;

const configureDigest = async (
  playground: PlaygroundComponent,
  { requestName = 'get users', username = 'user', password = 'pass' } = {}
): Promise<void> => {
  await playground.openRequest(requestName);
  await playground.selectTab('auth');
  await playground.auth.selectMode('digest');
  await playground.auth.field('username').fill(username);
  await playground.auth.field('password').fill(password);
};

test.describe('digest auth', () => {
  test.beforeEach(async ({ playground }) => {
    await playground.open('bottom');
  });

  test('completes the challenge handshake and shows the authenticated response', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock();

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    await expect(responsePane.bodyPanel).toContainText('authenticated');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[0].authorization).toBeNull();
    expect(mock.requests[1].authorization).toMatch(EXPECTED_AUTHORIZATION);
  });

  test('authenticates against a legacy server that omits qop', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({ qop: null });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).not.toContain('qop=');
  });

  test('shows the second 401 as a normal response for wrong credentials', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock();

    await configureDigest(playground, { password: 'wrong' });
    await responsePane.send();

    await expect(responsePane.status).toContainText('401');
    await expect(responsePane.errorBanner).toBeHidden();
    expect(mock.requests).toHaveLength(2);
  });

  test('explains a challenge the server sent but did not expose to the browser', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({ exposeChallenge: false });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Couldn\'t read the digest challenge');
    await expect(responsePane.errorMessage).toContainText('Access-Control-Expose-Headers');
    expect(mock.requests).toHaveLength(1);
  });

  test('explains a cross-origin 401 that carries no challenge at all', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({ sendChallenge: false });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Couldn\'t read the digest challenge');
    await expect(responsePane.errorMessage).toContainText('either the server didn\'t send one');
    expect(mock.requests).toHaveLength(1);
  });

  test('explains a malformed challenge missing realm and nonce', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({ challengeOverride: 'Digest qop="auth"' });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Couldn\'t complete digest auth');
    expect(mock.requests).toHaveLength(1);
  });

  test('passes a non-digest 401 through as the final response', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({ challengeOverride: 'Basic realm="digest-lab"' });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.status).toContainText('401');
    await expect(responsePane.errorBanner).toBeHidden();
    expect(mock.requests).toHaveLength(1);
  });

  test('completes the handshake when Basic is offered ahead of Digest', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({
      challengeOverride:
        'Basic realm="digest-lab", Digest realm="digest-lab", nonce="feedbeefcafe", opaque="deadbeef", algorithm=MD5, qop="auth"'
    });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).toMatch(/^Digest username="user", realm="digest-lab"/);
  });

  test('rejects a non-MD5 challenge with a clear error', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock({
      challengeOverride: 'Digest realm="digest-lab", nonce="abc123", algorithm=SHA-256, qop="auth"'
    });

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.errorTitle).toHaveText('Unsupported digest algorithm');
    expect(mock.requests).toHaveLength(1);
  });

  test('uploads the POST body on both the challenged leg and the signed retry', async ({ playground, responsePane, digestMock }) => {
    const mock = await digestMock();

    await configureDigest(playground, { requestName: 'echo json' });
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[0].postData).not.toBeNull();
    expect(mock.requests[1].postData).toBe(mock.requests[0].postData);
  });

  test('a request-level digest config overrides the collection auth', async ({ playground, responsePane, collectionSettings, digestMock }) => {
    const mock = await digestMock();

    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('auth');
    await collectionSettings.selectAuthMode('digest');
    await collectionSettings.authField('username').fill('user');
    await collectionSettings.authField('password').fill('collection-wrong');

    await configureDigest(playground);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).toMatch(EXPECTED_AUTHORIZATION);
  });
});

test.describe('digest auth — inheritance and variables', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test.beforeEach(async ({ playground }) => {
    await playground.open('inline');
  });

  test('applies collection-level digest through the inherit chain with an env-var url', async ({ playground, responsePane, collectionSettings, envEditor, digestMock }) => {
    const mock = await digestMock();

    await playground.openEnvironments();
    await envEditor.addVariable('baseUrl', 'http://localhost:8081');

    await playground.ensureSidebarOpen();
    await collectionSettings.open();
    await collectionSettings.openTab('auth');
    await collectionSettings.selectAuthMode('digest');
    await collectionSettings.authField('username').fill('user');
    await collectionSettings.authField('password').fill('pass');

    await playground.openTreeItem(['billing', 'customers', 'Get All Customers']);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).toMatch(/^Digest username="user", realm="digest-lab"/);
  });

  test('applies digest configured on the closest folder to an inheriting request', async ({ playground, responsePane, envEditor, digestMock }) => {
    const mock = await digestMock();

    await playground.openEnvironments();
    await envEditor.addVariable('baseUrl', 'http://localhost:8081');

    await playground.openTreeItem(['billing', 'customers']);
    await playground.folderSettingsTab('auth').click();
    await playground.auth.selectMode('digest');
    await playground.auth.field('username').fill('user');
    await playground.auth.field('password').fill('pass');

    await playground.openTreeItem(['Get All Customers']);
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).toMatch(/^Digest username="user", realm="digest-lab"/);
  });

  test('resolves {{variables}} in the digest username and password', async ({ playground, responsePane, envEditor, digestMock }) => {
    const mock = await digestMock();

    await playground.openEnvironments();
    await envEditor.addVariable('digest_user', 'user');
    await envEditor.addVariable('digest_pass', 'pass');

    await configureDigest(playground, { username: '{{digest_user}}', password: '{{digest_pass}}' });
    await responsePane.send();

    await expect(responsePane.status).toContainText('200');
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].authorization).toMatch(EXPECTED_AUTHORIZATION);
  });
});
