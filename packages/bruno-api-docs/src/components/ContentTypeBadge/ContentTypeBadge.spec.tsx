import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { getByTestId } from '../../test-utils/dom';
import { ContentTypeBadge } from './ContentTypeBadge';

describe('ContentTypeBadge', () => {
  it('renders the label', () => {
    expect(renderToStaticMarkup(<ContentTypeBadge label="application/json" />)).toContain('application/json');
  });

  it('is a plain, non-interactive chip by default', () => {
    const root = useRenderToDom(<ContentTypeBadge label="Inherited" testId="chip" />);
    const chip = getByTestId(root, 'chip');
    expect(chip.getAttribute('role')).toBeFalsy();
    expect(chip.classNames).not.toContain('content-type-badge--interactive');
  });

  it('becomes a keyboard-focusable button when given onClick, keeping the same chip and a title', () => {
    const root = useRenderToDom(
      <ContentTypeBadge label="Inherited from collection" title="Inherited from collection: My API" onClick={() => {}} testId="chip" />
    );
    const chip = getByTestId(root, 'chip');
    expect(chip.text).toContain('Inherited from collection');
    expect(chip.getAttribute('role')).toBe('button');
    expect(chip.getAttribute('tabindex')).toBe('0');
    expect(chip.getAttribute('title')).toBe('Inherited from collection: My API');
    expect(chip.classNames).toContain('content-type-badge--interactive');
  });
});
