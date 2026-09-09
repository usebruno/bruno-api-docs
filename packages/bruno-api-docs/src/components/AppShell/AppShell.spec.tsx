import React from 'react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';
import { createOpenCollectionStore } from '@/store/store';
import { setDocsCollection } from '@/store/slices/docs';
import { setPlaygroundCollection } from '@/store/slices/playground';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { queryByTestId } from '@/test-utils/dom';
import type { Surface } from '@/surfaces';

const collection = {
  info: { name: 'C' },
  items: [{ type: 'http', name: 'Login', method: 'POST', url: 'https://example.test/login' }]
} as any;

// The docs-only case renders with the playground's own `?pg=1` open flag set, so
// it asserts the surface list wins over the URL. The dock itself only renders in
// a browser (it reads window at render time), so it is verified there, not here.
const render = (surfaces?: readonly Surface[], path = '/login') => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  store.dispatch(setPlaygroundCollection(collection));
  return useRenderToDom(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell surfaces={surfaces} />
      </MemoryRouter>
    </Provider>
  );
};

describe('AppShell surfaces', () => {
  it('mounts the docs shell with a try button by default', () => {
    const root = render();
    expect(queryByTestId(root, 'app-shell')).not.toBeNull();
    expect(queryByTestId(root, 'request-try-button')).not.toBeNull();
  });

  it('drops the try button when the playground surface is off', () => {
    const root = render(['docs'], '/login?pg=1&pgReq=login');
    expect(queryByTestId(root, 'app-shell')).not.toBeNull();
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  it('mounts no docs shell when only the playground surface is on', () => {
    expect(queryByTestId(render(['playground']), 'app-shell')).toBeNull();
  });
});
