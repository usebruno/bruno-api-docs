import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/ui/CodeEditor/CodeEditor', () => ({
  default: ({ value }: { value: string }) => <pre data-testid="code-editor">{value}</pre>
}));

import PlaygroundBody from './PlaygroundBody';
import { createOpenCollectionStore } from '@/store/store';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId } from '@/test-utils/dom';
import {
  setPlaygroundCollection,
  setSelectedItemId,
  setSelectedExampleIndex,
  setViewMode
} from '@/store/slices/playground';
import { getItemUuid } from '@/utils/itemUtils';

const collection = {
  info: { name: 'C' },
  items: [
    {
      type: 'http',
      name: 'Login',
      method: 'POST',
      url: '/login',
      examples: [{ name: 'OK', response: { status: 200, body: { type: 'json', data: '{}' } } }]
    }
  ]
} as any;

describe('PlaygroundBody example view', () => {
  it('renders ExampleView when viewMode is example', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));
    const requestUuid = getItemUuid((store.getState().playground.hydratedCollection as any).items[0])!;
    store.dispatch(setSelectedItemId(requestUuid));
    store.dispatch(setSelectedExampleIndex(0));
    store.dispatch(setViewMode('example'));

    const ref = React.createRef<HTMLDivElement>();
    const root = useRenderToDom(
      <Provider store={store}>
        <MemoryRouter>
          <PlaygroundBody
            requestSlug={null}
            exampleSlug={null}
            sidebarOpen={false}
            dock="modal"
            onCloseSidebar={() => {}}
            onOpenSidebar={() => {}}
            appliedSlugRef={ref as any}
          />
        </MemoryRouter>
      </Provider>
    );
    expect(root.querySelector('[data-testid="example-view"]')).not.toBeNull();
  });
});

describe('PlaygroundBody script file view', () => {
  const withScript = {
    info: { name: 'C' },
    items: [{ info: { name: 'helpers', type: 'script' }, script: 'module.exports = { a: 1 };' }]
  } as any;

  it('shows a .js file as an editable script with no request controls', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withScript));
    const scriptUuid = getItemUuid((store.getState().playground.hydratedCollection as any).items[0])!;
    store.dispatch(setSelectedItemId(scriptUuid));
    store.dispatch(setViewMode('playground'));

    const ref = React.createRef<HTMLDivElement>();
    const root = useRenderToDom(
      <Provider store={store}>
        <MemoryRouter>
          <PlaygroundBody
            requestSlug={null}
            exampleSlug={null}
            sidebarOpen={false}
            dock="modal"
            onCloseSidebar={() => {}}
            onOpenSidebar={() => {}}
            appliedSlugRef={ref as any}
          />
        </MemoryRouter>
      </Provider>
    );
    expect(getByTestId(root, 'playground-script-file-title').textContent).toBe('helpers');
    expect(getByTestId(root, 'code-editor').textContent).toBe('module.exports = { a: 1 };');
    expect(root.querySelector('[data-testid="method-select"]')).toBeNull();
    expect(root.querySelector('[data-testid="query-bar-url"]')).toBeNull();
    expect(root.querySelector('[data-testid="query-bar-send"]')).toBeNull();
    expect(root.querySelector('[data-testid="response-tabs"]')).toBeNull();
  });
});
