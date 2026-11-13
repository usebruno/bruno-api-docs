import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@usebruno/api-shared/ui/CodeEditor/CodeEditor', () => ({
  default: ({ value }: { value: string }) => <pre data-testid="code-editor">{value}</pre>
}));

import type { OpenCollection } from '@opencollection/types';
import PlaygroundBody from './PlaygroundBody';
import { TestProviders } from '@usebruno/api-shared/test-utils/providers';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { getByTestId } from '@usebruno/api-shared/test-utils/dom';
import { hydrateWithUUIDs } from '@usebruno/api-shared/utils/fileUtils';
import { createSession } from '@usebruno/api-shared/session/session';
import { getItemUuid } from '@usebruno/api-shared/utils/itemUtils';

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
} as unknown as OpenCollection;

describe('PlaygroundBody example view', () => {
  it('renders ExampleView when viewMode is example', () => {
    const session = createSession();
    session.workspace.replaceCollection(hydrateWithUUIDs(collection));
    const requestUuid = getItemUuid(session.workspace.get().collection!.items![0])!;
    session.playground.selection.set({ uuid: requestUuid, exampleIndex: 0 });

    const ref = React.createRef<string>();
    const root = useRenderToDom(
      <TestProviders session={session}>
        <MemoryRouter>
          <PlaygroundBody
            requestSlug={null}
            exampleSlug={null}
            sidebarOpen={false}
            dock="modal"
            onCloseSidebar={() => {}}
            onOpenSidebar={() => {}}
            appliedSlugRef={ref}
          />
        </MemoryRouter>
      </TestProviders>
    );
    expect(root.querySelector('[data-testid="example-view"]')).not.toBeNull();
  });
});

describe('PlaygroundBody script file view', () => {
  const withScript = {
    info: { name: 'C' },
    items: [{ info: { name: 'helpers', type: 'script' }, script: 'module.exports = { a: 1 };' }]
  } as unknown as OpenCollection;

  it('shows a .js file as an editable script with no request controls', () => {
    const session = createSession();
    session.workspace.replaceCollection(hydrateWithUUIDs(withScript));
    const scriptUuid = getItemUuid(session.workspace.get().collection!.items![0])!;
    session.playground.selection.set({ uuid: scriptUuid, exampleIndex: null });

    const ref = React.createRef<string>();
    const root = useRenderToDom(
      <TestProviders session={session}>
        <MemoryRouter>
          <PlaygroundBody
            requestSlug={null}
            exampleSlug={null}
            sidebarOpen={false}
            dock="modal"
            onCloseSidebar={() => {}}
            onOpenSidebar={() => {}}
            appliedSlugRef={ref}
          />
        </MemoryRouter>
      </TestProviders>
    );
    expect(getByTestId(root, 'playground-script-file-title').textContent).toBe('helpers');
    expect(getByTestId(root, 'code-editor').textContent).toBe('module.exports = { a: 1 };');
    expect(root.querySelector('[data-testid="method-select"]')).toBeNull();
    expect(root.querySelector('[data-testid="query-bar-url"]')).toBeNull();
    expect(root.querySelector('[data-testid="query-bar-send"]')).toBeNull();
    expect(root.querySelector('[data-testid="response-tabs"]')).toBeNull();
  });
});
