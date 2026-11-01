import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { createOpenCollectionStore } from '@/store/store';
import type { RunRequestResponse } from '@/runner';
import ResponsePane from './ResponsePane';

const previousResponse = { status: 200, headers: {}, data: { ok: true } } as unknown as RunRequestResponse;

const pane = (isLoading: boolean, response?: RunRequestResponse) => (
  <Provider store={createOpenCollectionStore()}>
    <ResponsePane
      response={response as RunRequestResponse}
      isLoading={isLoading}
      requestStartedAt={isLoading ? Date.now() : null}
      onCancelRequest={() => {}}
      orientation="horizontal"
      itemUuid="item-1"
    />
  </Provider>
);

describe('Playground ResponsePane: loading state', () => {
  it('shows the timer and a Cancel Request button while a request runs', () => {
    const root = useRenderToDom(pane(true));

    expect(queryByTestId(root, 'response-loading')).not.toBeNull();
    expect(getByTestId(root, 'response-stopwatch').text).toBe('Loading...');
    expect(getByTestId(root, 'response-cancel-request').text.trim()).toBe('Cancel Request');
    expect(root.text).not.toContain('Click Send to make a request');
  });

  it('keeps the previous response under the loading overlay while a new request runs', () => {
    const root = useRenderToDom(pane(true, previousResponse));

    expect(queryByTestId(root, 'response-loading')).not.toBeNull();
    expect(queryByTestId(root, 'response-tabs')).not.toBeNull();
    expect(queryByTestId(root, 'response-status')).toBeNull();
  });

  it('shows the empty hint, not the loading view, when nothing is running', () => {
    const root = useRenderToDom(pane(false));

    expect(queryByTestId(root, 'response-loading')).toBeNull();
    expect(queryByTestId(root, 'response-cancel-request')).toBeNull();
    expect(root.text).toContain('Click Send to make a request');
  });
});
