import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import reducer, { setTheme, setThemeMode, selectTheme } from './theme';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import type { RootState } from '../store';

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

  it('defaults to the default family following the system mode', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ family: 'default', mode: 'system' });
  });

  it('seeds the initial mode from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'default', mode: 'dark' }));
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ family: 'default', mode: 'dark' });
  });

  it('setTheme replaces the whole state (pure, no side effects)', () => {
    const next = reducer({ family: 'default', mode: 'light' }, setTheme({ family: 'backstage', mode: 'dark' }));
    expect(next).toEqual({ family: 'backstage', mode: 'dark' });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('setThemeMode changes the mode and keeps the family', () => {
    expect(reducer({ family: 'backstage', mode: 'light' }, setThemeMode('dark')))
      .toEqual({ family: 'backstage', mode: 'dark' });
    expect(reducer({ family: 'default', mode: 'dark' }, setThemeMode('system')))
      .toEqual({ family: 'default', mode: 'system' });
  });

  it('selectTheme exposes the theme slice', () => {
    const state = { theme: { family: 'backstage', mode: 'dark' } } as unknown as RootState;
    expect(selectTheme(state)).toEqual({ family: 'backstage', mode: 'dark' });
  });
});
