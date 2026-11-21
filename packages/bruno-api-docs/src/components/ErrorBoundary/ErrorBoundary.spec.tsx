import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { query } from '@usebruno/api-shared/test-utils/dom';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders its children when they do not throw', () => {
    const root = useRenderToDom(
      <ErrorBoundary>
        <span className="ok">fine</span>
      </ErrorBoundary>
    );
    expect(query(root, '.ok').text).toBe('fine');
  });

  it('keeps a provided fallback dormant while its children render', () => {
    const root = useRenderToDom(
      <ErrorBoundary fallback={<span className="fb">fallback</span>}>
        <span className="ok">fine</span>
      </ErrorBoundary>
    );
    expect(query(root, '.ok').text).toBe('fine');
    expect(root.querySelector('.fb')).toBeNull();
  });

  it('flags an error via getDerivedStateFromError', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  it('leaves the fallback when resetKey changes, and only then', () => {
    const boundary = new ErrorBoundary({ children: null, resetKey: 'b' });
    boundary.state = { hasError: true };
    const setState = vi.spyOn(boundary, 'setState').mockImplementation(() => {});

    boundary.componentDidUpdate({ children: null, resetKey: 'b' });
    expect(setState).not.toHaveBeenCalled();

    boundary.componentDidUpdate({ children: null, resetKey: 'a' });
    expect(setState).toHaveBeenCalledWith({ hasError: false });
  });
});
