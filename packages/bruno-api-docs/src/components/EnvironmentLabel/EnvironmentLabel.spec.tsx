import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { query } from '@/test-utils/dom';
import { EnvironmentLabel } from './EnvironmentLabel';

describe('EnvironmentLabel', () => {
  it('renders the environment name and a color dot', () => {
    const root = useRenderToDom(<EnvironmentLabel name="Development" />);
    expect(root.querySelector('.environment-label-name')?.text.trim()).toBe('Development');
    expect(root.querySelector('.environment-label-dot')).toBeTruthy();
  });

  it('applies the environment color to the dot', () => {
    const root = useRenderToDom(<EnvironmentLabel name="Prod" color="#dc2626" />);
    expect(root.querySelector('.environment-label-dot')?.getAttribute('style')).toContain('#dc2626');
  });

  it('forwards custom class names to the root and the name', () => {
    const root = useRenderToDom(
      <EnvironmentLabel name="Staging" className="env-tab" nameClassName="env-tab-name" />
    );
    expect(root.querySelector('.environment-label.env-tab')).toBeTruthy();
    expect(root.querySelector('.environment-label-name.env-tab-name')).toBeTruthy();
  });
});

describe('EnvironmentLabel truncation', () => {
  it('clamps the name and anchors a tooltip when truncate is set', () => {
    const root = useRenderToDom(<EnvironmentLabel name="development-staging-area-1" truncate />);
    const name = query(root, '.environment-label-name');
    expect(name.classList.contains('environment-label-name--clamped')).toBe(true);
    expect(name.getAttribute('data-testid')).toBe('truncated-text');
    expect(name.text.trim()).toBe('development-staging-area-1');
  });

  it('renders a plain name by default, with no clamp and no tooltip anchor', () => {
    const root = useRenderToDom(<EnvironmentLabel name="Development" />);
    const name = query(root, '.environment-label-name');
    expect(name.classList.contains('environment-label-name--clamped')).toBe(false);
    expect(name.getAttribute('data-testid')).toBeFalsy();
  });
});
