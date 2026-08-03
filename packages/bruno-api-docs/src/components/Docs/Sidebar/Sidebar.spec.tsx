import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { createOpenCollectionStore } from '@/store/store';
import { query } from '@/test-utils/dom';
import { setDocsCollection } from '@slices/docs';
import Sidebar from './Sidebar';

const collection = {
  info: { name: 'C' },
  items: [
    { type: 'http', name: 'Login', method: 'POST', examples: [{ name: 'OK', response: { status: 200 } }] }
  ]
} as any;

// The highlight is read from the route, so render at the example's own path
// (<request-slug>/<example-slug>) - exactly the URL a sidebar example click
// navigates to.
const buildSidebar = () => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login/ok']}>
        <Sidebar />
      </MemoryRouter>
    </Provider>
  );
};

describe('Sidebar examples', () => {
  it('renders the highlighted example as an active sidebar row', () => {
    const root = useRenderToDom(buildSidebar());
    const row = query(root, '[data-testid="sidebar-example"]');
    expect(row.text).toContain('OK');
    expect(row.getAttribute('class') ?? '').toContain('active');
  });
});
