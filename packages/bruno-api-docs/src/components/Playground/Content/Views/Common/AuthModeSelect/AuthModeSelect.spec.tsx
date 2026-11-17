import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId } from '@/test-utils/dom';
import { AUTH_DEFAULTS } from '@/constants';
import { AuthModeSelect, authForMode, authModeOf } from './AuthModeSelect';

const noop = () => {};

describe('authModeOf', () => {
  it('reads the mode from an auth object, inherit, or nothing', () => {
    expect(authModeOf({ type: 'bearer', token: 't' })).toBe('bearer');
    expect(authModeOf('inherit')).toBe('inherit');
    expect(authModeOf(undefined)).toBe('none');
    expect(authModeOf(null)).toBe('none');
  });
});

describe('authForMode', () => {
  it('maps none to no auth and inherit to the inherit marker', () => {
    expect(authForMode('none')).toBeUndefined();
    expect(authForMode('inherit')).toBe('inherit');
  });

  it('returns a fresh copy of the mode defaults', () => {
    const basic = authForMode('basic');
    expect(basic).toEqual(AUTH_DEFAULTS.basic);
    expect(basic).not.toBe(AUTH_DEFAULTS.basic);
  });

  it('falls back to a bare typed auth for a mode without defaults', () => {
    expect(authForMode('oauth2')).toEqual({ type: 'oauth2' });
  });
});

describe('AuthModeSelect', () => {
  it('shows the current mode on the trigger', () => {
    const root = useRenderToDom(<AuthModeSelect auth={{ type: 'apikey' }} onChange={noop} />);
    const trigger = getByTestId(root, 'auth-mode-select');
    expect(trigger.text.trim()).toBe('API Key');
    expect(trigger.getAttribute('aria-label')).toBe('Authentication type');
  });

  it('labels inherit only when Inherit is offered', () => {
    const withInherit = useRenderToDom(<AuthModeSelect auth="inherit" onChange={noop} showInherit />);
    expect(getByTestId(withInherit, 'auth-mode-select').text.trim()).toBe('Inherit');

    const withoutInherit = useRenderToDom(<AuthModeSelect auth="inherit" onChange={noop} />);
    expect(getByTestId(withoutInherit, 'auth-mode-select').text.trim()).toBe('');
  });
});
