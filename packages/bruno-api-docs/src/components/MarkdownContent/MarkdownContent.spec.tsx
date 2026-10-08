import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, query } from '@/test-utils/dom';
import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent', () => {
  it('injects the rendered markdown', () => {
    const root = useRenderToDom(<MarkdownContent html="<h1>Title</h1><p>Body</p>" testId="docs" />);
    const container = getByTestId(root, 'docs');
    expect(query(container, 'h1').textContent).toBe('Title');
    expect(query(container, 'p').textContent).toBe('Body');
  });

  it('forwards the class name', () => {
    const root = useRenderToDom(
      <MarkdownContent html="<p>x</p>" className="markdown-documentation extra" testId="docs" />
    );
    expect(getByTestId(root, 'docs').getAttribute('class')).toBe('markdown-documentation extra');
  });

  it('marks the block for heading collection when asked', () => {
    const root = useRenderToDom(<MarkdownContent html="<h2>A</h2>" testId="docs" navHeadings navLevel={2} />);
    const container = getByTestId(root, 'docs');
    expect(container.getAttribute('data-nav-headings')).toBe('');
    expect(container.getAttribute('data-nav-level')).toBe('2');
  });

  it('omits the nav marker by default', () => {
    const root = useRenderToDom(<MarkdownContent html="<h2>A</h2>" testId="docs" />);
    expect(getByTestId(root, 'docs').getAttribute('data-nav-headings')).toBeUndefined();
  });
});
