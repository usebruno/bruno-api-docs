import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query } from '../../test-utils/dom';
import { useDocument } from '../../document/document';
import CollectionShell from './CollectionShell';
import { useCollectionLoader } from './useCollectionLoader';
import type * as Loader from './useCollectionLoader';

vi.mock('./useCollectionLoader', async (importOriginal) => {
  const actual = await importOriginal<typeof Loader>();
  return { ...actual, useCollectionLoader: vi.fn(actual.useCollectionLoader) };
});

const DocumentName: React.FC<{ sourceText: string | null }> = ({ sourceText }) => (
  <div data-testid="child">{`${useDocument().info?.name} from ${sourceText}`}</div>
);

describe('CollectionShell', () => {
  it('shows Loading and not its children until the collection has loaded', () => {
    const root = useRenderToDom(
      <CollectionShell collection={{ info: { name: 'Users API' } }}>
        {() => <div data-testid="child" />}
      </CollectionShell>
    );

    expect(root.text).toBe('Loading...');
    expect(root.querySelector('[data-testid="child"]')).toBeNull();
  });

  it('fills the screen while loading by default, or the height class the caller picks', () => {
    const byDefault = useRenderToDom(<CollectionShell collection="info: { name: Users API }">{() => null}</CollectionShell>);
    const filled = useRenderToDom(
      <CollectionShell collection="info: { name: Users API }" heightClass="h-full">{() => null}</CollectionShell>
    );

    expect(query(byDefault, 'div').getAttribute('class')).toBe('flex items-center justify-center h-screen');
    expect(query(filled, 'div').getAttribute('class')).toBe('flex items-center justify-center h-full');
  });

  it('renders its children with the source text and the loaded document once loaded', () => {
    const document = { info: { name: 'Users API' }, items: [] } as unknown as OpenCollection;
    vi.mocked(useCollectionLoader).mockReturnValueOnce({
      status: 'succeeded',
      error: null,
      sourceText: 'info: { name: Users API }',
      document
    });

    const root = useRenderToDom(
      <CollectionShell collection="info: { name: Users API }">
        {(sourceText) => <DocumentName sourceText={sourceText} />}
      </CollectionShell>
    );

    expect(query(root, '[data-testid="child"]').text).toBe('Users API from info: { name: Users API }');
  });
});
