import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '../../test-utils/dom';
import WarningBanner from './WarningBanner';

const SET_MAX_REDIRECTS = 'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.';
const ON_FAIL = 'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.';

describe('WarningBanner', () => {
  it('renders the message under a singular title for one warning', () => {
    const root = useRenderToDom(<WarningBanner warnings={[SET_MAX_REDIRECTS]} />);
    expect(getByTestId(root, 'warning-banner')).toBeTruthy();
    expect(getByTestId(root, 'warning-title').textContent).toBe('Warning');
    expect(getByTestId(root, 'warning-message').textContent).toBe(SET_MAX_REDIRECTS);
  });

  it('uses a plural title and lists every message when there is more than one warning', () => {
    const root = useRenderToDom(<WarningBanner warnings={[SET_MAX_REDIRECTS, ON_FAIL]} />);
    expect(getByTestId(root, 'warning-title').textContent).toBe('Warnings');
    const messages = Array.from(root.querySelectorAll('[data-testid="warning-message"]')).map((el) => el.textContent);
    expect(messages).toEqual([SET_MAX_REDIRECTS, ON_FAIL]);
  });

  it('renders nothing when there are no warnings', () => {
    const root = useRenderToDom(<WarningBanner warnings={[]} />);
    expect(queryByTestId(root, 'warning-banner')).toBeNull();
  });
});
