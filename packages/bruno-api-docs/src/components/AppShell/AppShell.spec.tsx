import React from 'react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';
import { createOpenCollectionStore } from '@/store/store';
import { collectionLoaded } from '@/store/slices/collection';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { queryByTestId } from '@/test-utils/dom';

const collection = {
  info: { name: 'C' },
  items: [{ type: 'http', name: 'Login', method: 'POST', url: 'https://example.test/login' }]
} as any;

const render = (renderPlayground?: (openNonce: number) => React.ReactNode, path = '/login') => {
  const store = createOpenCollectionStore();
  store.dispatch(collectionLoaded(collection));
  return useRenderToDom(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell renderPlayground={renderPlayground} />
      </MemoryRouter>
    </Provider>
  );
};

describe('AppShell playground slot', () => {
  it('offers Try when a playground is supplied', () => {
    const root = render(() => null);
    expect(queryByTestId(root, 'app-shell')).not.toBeNull();
    expect(queryByTestId(root, 'request-try-button')).not.toBeNull();
  });

  it('drops Try when no playground is supplied', () => {
    const root = render();
    expect(queryByTestId(root, 'app-shell')).not.toBeNull();
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  // `?pg=1` is the playground's own open flag: a docs-only build must ignore it
  // rather than reach for a playground it does not have.
  it('ignores the playground open flag in the URL when no playground is supplied', () => {
    const root = render(undefined, '/login?pg=1&pgReq=login');
    expect(queryByTestId(root, 'app-shell')).not.toBeNull();
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });
});
