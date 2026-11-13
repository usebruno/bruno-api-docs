import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { queryByTestId } from '@usebruno/api-shared/test-utils/dom';
import { Tags } from './Tags';

describe('Tags', () => {
  it('renders nothing for an empty tag list', () => {
    const root = useRenderToDom(<Tags tags={[]} />);
    expect(queryByTestId(root, 'tags')).toBeNull();
  });

  it('renders one chip per tag with the derived test id', () => {
    const root = useRenderToDom(<Tags tags={['auth', 'smoke']} testId="request-tags" />);
    const chips = root.querySelectorAll('[data-testid="request-tags-chip"]');
    expect(chips).toHaveLength(2);
    expect(chips[0].text).toContain('auth');
    expect(chips[1].text).toContain('smoke');
  });

  it('renders inherited tags as muted chips after the own tags', () => {
    const root = useRenderToDom(<Tags tags={['smoke']} inheritedTags={['billing']} testId="request-tags" />);
    expect(root.querySelectorAll('[data-testid="request-tags-chip"]')).toHaveLength(1);
    const inherited = root.querySelectorAll('[data-testid="request-tags-inherited-chip"]');
    expect(inherited).toHaveLength(1);
    expect(inherited[0].classNames).toContain('is-inherited');
    expect(inherited[0].text).toContain('billing');
  });

  it('renders inherited-only tags without any own chips', () => {
    const root = useRenderToDom(<Tags tags={[]} inheritedTags={['billing']} testId="request-tags" />);
    expect(root.querySelectorAll('[data-testid="request-tags-inherited-chip"]')).toHaveLength(1);
    expect(queryByTestId(root, 'request-tags-chip')).toBeNull();
  });
});
