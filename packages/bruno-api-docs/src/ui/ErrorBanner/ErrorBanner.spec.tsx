import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import ErrorBanner from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders the title, message and hint', () => {
    const root = useRenderToDom(<ErrorBanner title="Request Failed" message="Network Error" hint="Check the URL." />);
    expect(getByTestId(root, 'error-title').textContent).toBe('Request Failed');
    expect(getByTestId(root, 'error-message').textContent).toBe('Network Error');
    expect(getByTestId(root, 'error-hint').textContent).toBe('Check the URL.');
  });

  it('shows a dismiss button only when onDismiss is given', () => {
    const withDismiss = useRenderToDom(<ErrorBanner title="Test Script Error" message="boom" onDismiss={() => {}} />);
    expect(getByTestId(withDismiss, 'error-banner-dismiss').getAttribute('aria-label')).toBe('Dismiss error');

    const withoutDismiss = useRenderToDom(<ErrorBanner title="Request Failed" message="boom" />);
    expect(queryByTestId(withoutDismiss, 'error-banner-dismiss')).toBeNull();
    expect(queryByTestId(withoutDismiss, 'error-hint')).toBeNull();
  });
});
