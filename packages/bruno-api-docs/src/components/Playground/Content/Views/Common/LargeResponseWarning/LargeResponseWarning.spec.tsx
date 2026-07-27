import React from 'react';
import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../../../../../utils/exampleResponse';
import { LargeResponseWarning } from './LargeResponseWarning';
import { useRenderToDom } from '../../../../../../hooks/useRenderToDom';
import { query, getByTestId } from '../../../../../../test-utils/dom';

describe('LargeResponseWarning', () => {
  const responseSize = 11 * 1024 * 1024;

  it('renders the warning title', () => {
    const root = useRenderToDom(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    expect(query(root, '.large-response-title').text).toContain('Large Response Warning');
  });

  it('renders the formatted current response size', () => {
    const root = useRenderToDom(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    expect(root.text).toContain(formatBytes(responseSize));
  });

  it('renders a View button with the reveal test id', () => {
    const root = useRenderToDom(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    const view = getByTestId(root, 'large-response-view');
    expect(view.tagName).toBe('BUTTON');
    expect(view.text.trim()).toBe('View');
  });
});
