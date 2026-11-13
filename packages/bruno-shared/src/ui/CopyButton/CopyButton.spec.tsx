import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { getByTestId } from '../../test-utils/dom';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  it('renders an accessible button with the default copy label', () => {
    const button = getByTestId(useRenderToDom(<CopyButton text="hello" />), 'copy-button');
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Copy');
  });

  it('uses the provided label', () => {
    const button = getByTestId(useRenderToDom(<CopyButton text="hello" label="Copy code" />), 'copy-button');
    expect(button.getAttribute('aria-label')).toBe('Copy code');
  });

  it('is not marked copied on first render', () => {
    const root = useRenderToDom(<CopyButton text="hello" />);
    expect(getByTestId(root, 'copy-button').getAttribute('data-copied')).toBeFalsy();
  });
});
