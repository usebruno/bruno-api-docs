import { test, expect } from '../../playwright';

const LIVE_UPDATES = ['Realtime', 'Live Updates'];

test.describe('Request page — WebSocket requests', () => {
  test('renders the request identity without offering to run it', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);

    await expect(websocketRequestPage.title).toHaveText('Live Updates');
    await expect(websocketRequestPage.breadcrumb.segment('Realtime')).toBeVisible();
    await expect(websocketRequestPage.breadcrumb.current).toHaveText('Live Updates');
    await expect(websocketRequestPage.urlBar.method).toHaveText('WS');
    await expect(websocketRequestPage.urlBar.url).toContainText('/ws/updates');
    await expect(websocketRequestPage.urlBar.tryButton).toHaveCount(0);
  });

  test('renders the request docs', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);

    await expect(websocketRequestPage.description).toContainText('full-duplex communication channel');
  });

  test('lists every message with its name and format, the first one open', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);
    const { messages } = websocketRequestPage;

    await expect(websocketRequestPage.messagesSection).toContainText('5 messages');
    await expect(messages.card(0)).toContainText('Subscribe');
    await expect(messages.card(0)).toContainText('JSON');
    await expect(messages.card(1)).toContainText('Ping');
    await expect(messages.card(1)).toContainText('Text');

    await expect(messages.toggle(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(messages.toggle(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(messages.code(1)).toHaveCount(0);
  });

  test('pretty-prints a JSON message stored on one line', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);

    // The sample stores Subscribe as a single line; each key lands on its own line once formatted.
    await expect(websocketRequestPage.messages.code(0).locator('.code-line-numbers span')).toHaveCount(4);
  });

  test('opens a collapsed message on click', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);
    const { messages } = websocketRequestPage;

    await messages.expand(1);

    await expect(messages.toggle(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(messages.code(1)).toContainText('ping');
  });

  test('shows the headers and the auth it inherits', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);

    await expect(websocketRequestPage.headersSection).toContainText('Accept');
    await expect(websocketRequestPage.headersSection).toContainText('X-Trace-Id');
    await expect(websocketRequestPage.authSection).toBeVisible();
    await expect(websocketRequestPage.authInheritedBadge).toBeVisible();
  });

  test('shows only the first three messages until show more is used', async ({ websocketRequestPage }) => {
    await websocketRequestPage.open(LIVE_UPDATES);
    const { messages } = websocketRequestPage;

    await expect(messages.card(2)).toBeVisible();
    await expect(messages.card(3)).toHaveCount(0);
    await expect(messages.showToggle).toHaveText('Show more');

    await messages.showToggle.click();

    await expect(messages.card(4)).toBeVisible();
    await expect(messages.showToggle).toHaveText('Show less');
  });
});
