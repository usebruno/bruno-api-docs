import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@usebruno/api-shared/ui/CodeEditor/CodeEditor', () => ({
  default: ({ value }: { value: string }) => <pre data-testid="code-editor">{value}</pre>
}));

import type { OpenCollection } from '@opencollection/types';
import StandalonePlayground from './StandalonePlayground';
import { TestProviders } from '@usebruno/api-shared/test-utils/providers';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@usebruno/api-shared/test-utils/dom';
import { hydrateWithUUIDs } from '@usebruno/api-shared/utils/fileUtils';

const collection = {
  info: { name: 'C' },
  items: [{ info: { name: 'Login', type: 'http' }, http: { method: 'POST', url: 'https://api.example.com/login' } }]
} as unknown as OpenCollection;

describe('StandalonePlayground', () => {
  it('shows the sidebar and the view with no dock header', () => {
    const root = useRenderToDom(
      <TestProviders document={hydrateWithUUIDs(collection)}>
        <MemoryRouter>
          <StandalonePlayground />
        </MemoryRouter>
      </TestProviders>
    );

    expect(getByTestId(root, 'standalone-playground').getAttribute('class')).toContain('oc-playground');
    expect(getByTestId(root, 'playground-sidebar-panel').text).toContain('Login');
    expect(queryByTestId(root, 'playground-view')).not.toBeNull();
    expect(queryByTestId(root, 'playground-header')).toBeNull();
    expect(queryByTestId(root, 'playground-sidebar-backdrop')).toBeNull();
  });
});
