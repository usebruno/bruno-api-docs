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

    await expect(grpcRequestPage.messageToggle(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(grpcRequestPage.messageToggle(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(grpcRequestPage.messageCode(0)).toBeVisible();
  });

  test('offers no show-more control when every message already fits', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);

    await expect(grpcRequestPage.showToggle).toHaveCount(0);
  });

  test('collapses a message that was open', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Send Greetings']);
    await grpcRequestPage.messageToggle(0).click();

    await expect(grpcRequestPage.messageToggle(0)).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows only the first three messages until show more is used', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Bulk Upload']);

    await expect(grpcRequestPage.messagesSection).toContainText('6 messages');
    await expect(grpcRequestPage.messageCard(2)).toBeVisible();
    await expect(grpcRequestPage.messageCard(3)).toHaveCount(0);
    await expect(grpcRequestPage.showToggle).toHaveText('Show more');

    await grpcRequestPage.showToggle.click();

    await expect(grpcRequestPage.messageCard(5)).toBeVisible();
    await expect(grpcRequestPage.showToggle).toHaveText('Show less');
  });

  test('keeps every expanded message open across show more and show less', async ({ grpcRequestPage }) => {
    await grpcRequestPage.open([REALTIME, 'Bulk Upload']);

    await grpcRequestPage.messageToggle(1).click();
    await grpcRequestPage.messageToggle(2).click();
    await grpcRequestPage.showToggle.click();
    await grpcRequestPage.messageToggle(4).click();
    await grpcRequestPage.showToggle.click();

    await expect(grpcRequestPage.messageCard(3)).toHaveCount(0);
    await expect(grpcRequestPage.messageToggle(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(grpcRequestPage.messageToggle(2)).toHaveAttribute('aria-expanded', 'true');

    await grpcRequestPage.showToggle.click();

    await expect(grpcRequestPage.messageToggle(4)).toHaveAttribute('aria-expanded', 'true');
  });
});
