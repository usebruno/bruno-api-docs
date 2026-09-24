import { test, expect } from '../../playwright';

const USERS_BODY = '{"data":[{"id":1,"name":"Alice"}]}';

test.describe('Browser storage keys', () => {
  test('everything the app remembers is stored under the oc-docs prefix', async ({
    page,
    grpcRequestPage,
    playground,
    responsePane
  }) => {
    await grpcRequestPage.open(['Realtime', 'Order Service']);
    await grpcRequestPage.executionContextToggle.click();

    await responsePane.mockUsersResponse(USERS_BODY);
    await playground.open('bottom');
    await playground.openRequest('get users');
    await playground.selectTab('headers');
    await responsePane.send();
    await responsePane.switchToTab('headers');

    const keys = await page.evaluate(() => [...Object.keys(sessionStorage), ...Object.keys(localStorage)]);
    expect(keys).toEqual(expect.arrayContaining([
      'oc-docs:playgroundRequestTab',
      'oc-docs:playgroundResponseTab',
      'oc-docs:section-grpc-request-execution-context'
    ]));
    expect(keys.filter((key) => !key.startsWith('oc-docs'))).toEqual([]);
  });
});
