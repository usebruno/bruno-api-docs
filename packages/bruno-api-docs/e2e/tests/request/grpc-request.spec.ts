import { test, expect } from '../../playwright';

const REALTIME = 'Realtime';

test.describe('Request page — gRPC requests', () => {
  test('renders the request identity without offering to run it', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.title).toHaveText('Order Service');
    await expect(grpcRequestPage.breadcrumb.current).toHaveText('Order Service');
    await expect(grpcRequestPage.urlBar.method).toHaveText('gRPC');
    await expect(grpcRequestPage.urlBar.url).toContainText('grpcUrl');
    await expect(grpcRequestPage.urlBar.tryButton).toHaveCount(0);
  });

  test('marks the grpcurl command plaintext for an unencrypted environment', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.codeSnippet).toContainText('-plaintext');
    await expect(grpcRequestPage.codeSnippet).toContainText('{{grpcUrl}}');
  });

  test('drops plaintext when the environment resolves the address to TLS', async ({ grpcRequestPage, envSwitcher }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await envSwitcher.selectEnvironment('Prod');

    await expect(grpcRequestPage.codeSnippet).not.toContainText('-plaintext');
    await expect(grpcRequestPage.codeSnippet).toContainText('{{grpcUrl}}');
  });

  test('renders the request docs when the request provides them', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.description).toContainText('Fetches a single order by id over gRPC');
  });

  test('shows the method with its streaming type', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);

    await expect(grpcRequestPage.method).toContainText('hello.HelloService/LotsOfGreetings');
    await expect(grpcRequestPage.method).not.toContainText('/hello.HelloService');
    await expect(grpcRequestPage.method).toContainText('Client Streaming');
  });

  test('shows the proto file name when one is attached', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Get Book']);

    await expect(grpcRequestPage.protoFile).toHaveText('book.proto');
  });

  test('omits the proto file section when the request uses reflection', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.protoFileSection).toHaveCount(0);
    await expect(grpcRequestPage.methodSection).toBeVisible();
  });

  test('lists metadata with its descriptions and marks disabled rows', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.metadata).toContainText('authorization');
    await expect(grpcRequestPage.metadata).toContainText('Auth token forwarded to the service');
    await expect(grpcRequestPage.metadata).toContainText('x-legacy-flag');
    await expect(grpcRequestPage.metadata.getByTestId('disabled-badge')).toBeVisible();
    await expect(grpcRequestPage.metadataSection).toContainText('2 fields');
  });

  test('resolves inherited auth and names where it came from', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);

    await expect(grpcRequestPage.authInheritedBadge).toHaveText(`Inherited from folder: ${REALTIME}`);
    await expect(grpcRequestPage.auth).toContainText('No auth');
  });

  test('navigates to the folder the auth came from', async ({ grpcRequestPage, folderPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await grpcRequestPage.authInheritedBadge.click();

    await expect(folderPage.root).toBeVisible();
    await expect(folderPage.title).toHaveText(REALTIME);
  });

  test('shows concrete auth with its secret masked', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Get Book']);

    await expect(grpcRequestPage.auth).toContainText('Basic Auth');
    await expect(grpcRequestPage.auth).toContainText('reader');
    await expect(grpcRequestPage.auth).not.toContainText('s3cret');
  });

  test('omits the auth section when the request has none', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Chat']);

    await expect(grpcRequestPage.authSection).toHaveCount(0);
  });

  test('shows one empty state when the request has no configuration', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Bare Method']);

    await expect(grpcRequestPage.emptyState).toContainText('No request configuration');
    await expect(grpcRequestPage.methodSection).toHaveCount(0);
    await expect(grpcRequestPage.messagesSection).toHaveCount(0);
  });
});

test.describe('Request page — gRPC messages', () => {
  test('opens the first message and leaves the rest closed', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);

    await expect(grpcRequestPage.messages.toggle(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(grpcRequestPage.messages.toggle(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(grpcRequestPage.messages.code(0)).toBeVisible();
  });

  test('offers no show-more control when every message already fits', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);

    await expect(grpcRequestPage.messages.showToggle).toHaveCount(0);
  });

  test('collapses a message that was open', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);
    await grpcRequestPage.messages.toggle(0).click();

    await expect(grpcRequestPage.messages.toggle(0)).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows only the first three messages until show more is used', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Bulk Upload']);

    await expect(grpcRequestPage.messagesSection).toContainText('6 messages');
    await expect(grpcRequestPage.messages.card(2)).toBeVisible();
    await expect(grpcRequestPage.messages.card(3)).toHaveCount(0);
    await expect(grpcRequestPage.messages.showToggle).toHaveText('Show more');

    await grpcRequestPage.messages.showToggle.click();

    await expect(grpcRequestPage.messages.card(5)).toBeVisible();
    await expect(grpcRequestPage.messages.showToggle).toHaveText('Show less');
  });

  test('keeps every expanded message open across show more and show less', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Bulk Upload']);

    await grpcRequestPage.messages.toggle(1).click();
    await grpcRequestPage.messages.toggle(2).click();
    await grpcRequestPage.messages.showToggle.click();
    await grpcRequestPage.messages.toggle(4).click();
    await grpcRequestPage.messages.showToggle.click();

    await expect(grpcRequestPage.messages.card(3)).toHaveCount(0);
    await expect(grpcRequestPage.messages.toggle(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(grpcRequestPage.messages.toggle(2)).toHaveAttribute('aria-expanded', 'true');

    await grpcRequestPage.messages.showToggle.click();

    await expect(grpcRequestPage.messages.toggle(4)).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Request page — gRPC execution context', () => {
  test('lists the variables the request defines', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await grpcRequestPage.executionContext.openTab('variables');

    await expect(grpcRequestPage.executionContext.variable('orderId')).toBeVisible();
    await expect(grpcRequestPage.executionContext.variable('lastOrderStatus')).toBeVisible();
  });

  test('lists the scripts that run around the call', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await grpcRequestPage.executionContext.openTab('scripts');

    await expect(grpcRequestPage.executionContext.scriptStep('Request Pre-Request')).toBeVisible();
    await expect(grpcRequestPage.executionContext.scriptStep('Request Post-Response')).toBeVisible();
  });

  test('lists the assertions the request declares', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await grpcRequestPage.executionContext.openTab('asserts');

    await expect(grpcRequestPage.executionContext.assertion('res.body.orderId')).toBeVisible();
  });

  test('lists the tests the request declares', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Order Service']);
    await grpcRequestPage.executionContext.openTab('tests');

    await expect(grpcRequestPage.executionContext.testsPanel).toContainText('returns the requested order');
  });

  test('still shows the inherited chain for a request with no runtime of its own', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Chat']);
    await grpcRequestPage.executionContext.openTab('scripts');

    await expect(grpcRequestPage.executionContext.scriptStep('Collection Pre-Request')).toBeVisible();
    await expect(grpcRequestPage.executionContext.scriptStep('Request Pre-Request')).toHaveCount(0);
  });
});
