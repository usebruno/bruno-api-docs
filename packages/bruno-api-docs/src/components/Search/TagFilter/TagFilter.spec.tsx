import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@usebruno/api-shared/test-utils/dom';
import TagFilter from './TagFilter';

describe('TagFilter', () => {
  it('renders nothing when the collection has no tags', () => {
    const root = useRenderToDom(<TagFilter tags={[]} selected={new Set()} onToggle={() => {}} />);
    expect(queryByTestId(root, 'search-tag-filter')).toBeNull();
  });

  it('shows the neutral label when nothing is selected', () => {
    const root = useRenderToDom(<TagFilter tags={['auth', 'smoke']} selected={new Set()} onToggle={() => {}} />);
    const button = getByTestId(root, 'search-tag-filter-button');
    expect(button.text).toContain('Tags');
    expect(button.classNames).not.toContain('is-active');
  });

  it('shows the tag name when exactly one is selected', () => {
    const root = useRenderToDom(
      <TagFilter tags={['auth', 'smoke']} selected={new Set(['auth'])} onToggle={() => {}} />
    );
    const button = getByTestId(root, 'search-tag-filter-button');
    expect(button.text).toContain('auth');
    expect(button.classNames).toContain('is-active');
  });

  it('shows a count when several are selected', () => {
    const root = useRenderToDom(
      <TagFilter tags={['auth', 'smoke', 'bookings']} selected={new Set(['auth', 'smoke'])} onToggle={() => {}} />
    );
    expect(getByTestId(root, 'search-tag-filter-button').text).toContain('2 tags');
  });
});
