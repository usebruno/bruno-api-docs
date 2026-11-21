import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query } from '../../test-utils/dom';
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

  it('fills the screen while loading by default, or the height class the caller picks', () => {
    const byDefault = useRenderToDom(<CollectionShell collection="info: { name: Users API }">{() => null}</CollectionShell>);
    const filled = useRenderToDom(
      <CollectionShell collection="info: { name: Users API }" heightClass="h-full">{() => null}</CollectionShell>
    );

    expect(query(byDefault, 'div').getAttribute('class')).toBe('flex items-center justify-center h-screen');
    expect(query(filled, 'div').getAttribute('class')).toBe('flex items-center justify-center h-full');
  });
});
