import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { createOpenCollectionStore } from '@/store/store';
import { setDocsCollection } from '@/store/slices/docs';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import AppShell from './AppShell';

const collection = {
  info: { name: 'Users API' },
  items: [
    {
      info: { name: 'Get Users', type: 'http' },
      http: { method: 'GET', url: 'https://api.example.com/users' }
    }
  ]
} as unknown as OpenCollection;

const render = (url: string, hidePlayground: boolean) => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(hydrateWithUUIDs(collection)));
  return parse(
    renderToStaticMarkup(
      <Provider store={store}>
        <MemoryRouter initialEntries={[url]}>
          <AppShell hidePlayground={hidePlayground} />
        </MemoryRouter>
      </Provider>
    )
  );
};

describe('AppShell playground visibility', () => {
  it('docks the playground for a pg=1 link when the playground is enabled', () => {
    expect(getByTestId(render('/?pg=1&dock=inline', false), 'app-shell').getAttribute('data-dock')).toBe('inline');
  });

  it.each(['bottom', 'inline', 'modal'])('keeps the playground closed for pg=1&dock=%s when it is hidden', (dock) => {
    const root = render(`/?pg=1&dock=${dock}`, true);
    expect(getByTestId(root, 'app-shell').getAttribute('data-dock')).toBe('none');
    expect(queryByTestId(root, 'playground-header')).toBeNull();
  });

  it.each(['bottom', 'inline', 'modal'])('keeps the playground closed for pg=1&dock=%s&hidePlayground=1', (dock) => {
    const root = render(`/?pg=1&dock=${dock}&hidePlayground=1`, false);
    expect(getByTestId(root, 'app-shell').getAttribute('data-dock')).toBe('none');
    expect(queryByTestId(root, 'playground-header')).toBeNull();
  });

  it('shows the request docs page without a Try button for a pg=1 request link when hidden', () => {
    const root = render('/get-users?pg=1&dock=bottom&pgReq=get-users', true);
    expect(getByTestId(root, 'page').getAttribute('data-page-slug')).toBe('get-users');
    expect(getByTestId(root, 'app-shell').getAttribute('data-dock')).toBe('none');
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  it('offers the Try button on the same request page when the playground is enabled', () => {
    expect(queryByTestId(render('/get-users', false), 'request-try-button')).not.toBeNull();
  });
});
