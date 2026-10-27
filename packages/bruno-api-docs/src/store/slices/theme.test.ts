import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import reducer, { setTheme, setThemeMode, selectTheme } from './theme';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import type { RootState } from '@/store/store';

beforeAll(() => {
  let store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; }
  });
});

describe('themeSlice', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to the default variant following the system mode', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ variant: 'default', mode: 'system' });
  });

  it('does not read localStorage for its fallback initial state', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'dark' }));
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ variant: 'default', mode: 'system' });
  });

  it('setTheme replaces the whole state (pure, no side effects)', () => {
    const next = reducer({ variant: 'default', mode: 'light' }, setTheme({ variant: 'backstage', mode: 'dark' }));
    expect(next).toEqual({ variant: 'backstage', mode: 'dark' });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('setThemeMode changes the mode and keeps the variant', () => {
    expect(reducer({ variant: 'backstage', mode: 'light' }, setThemeMode('dark')))
      .toEqual({ variant: 'backstage', mode: 'dark' });
    expect(reducer({ variant: 'default', mode: 'dark' }, setThemeMode('system')))
      .toEqual({ variant: 'default', mode: 'system' });
  });

  it('selectTheme exposes the theme slice', () => {
    const state = { theme: { variant: 'backstage', mode: 'dark' } } as unknown as RootState;
    expect(selectTheme(state)).toEqual({ variant: 'backstage', mode: 'dark' });
  });
});
