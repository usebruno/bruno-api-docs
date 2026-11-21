import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import CollectionShell from './CollectionShell';

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
});
