import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import {
  getApiDocsTheme,
  getAppThemeMode,
  getThemeStateFrom,
  getThemeValuesFromLocalStorage
} from './theme';

const stubOsPrefersDark = () =>
  vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('dark'), media: q }) });

beforeAll(() => {
  let store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; }
  });
});

describe('theme utils', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.stubGlobal('window', undefined));

  describe('getThemeStateFrom', () => {
    it('keeps only supported variant and mode values', () => {
      expect(getThemeStateFrom({ variant: 'backstage', mode: 'dark' })).toEqual({ variant: 'backstage', mode: 'dark' });
      expect(getThemeStateFrom({ variant: 'sepia', mode: 'dim' })).toEqual({ variant: undefined, mode: undefined });
    });

    it('ignores anything that is not a plain object', () => {
      expect(getThemeStateFrom('backstage-dark')).toEqual({});
      expect(getThemeStateFrom(null)).toEqual({});
      expect(getThemeStateFrom(['dark'])).toEqual({});
    });
  });

  describe('getThemeValuesFromLocalStorage', () => {
    it('returns nothing when nothing is stored', () => {
      expect(getThemeValuesFromLocalStorage(false)).toEqual({});
    });

    it('reads the stored JSON theme state', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'backstage', mode: 'dark' }));
      expect(getThemeValuesFromLocalStorage(false)).toEqual({ variant: 'backstage', mode: 'dark' });
    });

    it('reads the legacy bare mode string', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getThemeValuesFromLocalStorage(false)).toEqual({ mode: 'dark' });
    });

    it('drops unrecognised or malformed stored values', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'sepia' }));
      expect(getThemeValuesFromLocalStorage(false)).toEqual({ variant: 'default', mode: undefined });
      localStorage.setItem(THEME_STORAGE_KEY, 'null');
      expect(getThemeValuesFromLocalStorage(false)).toEqual({});
      localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
      expect(getThemeValuesFromLocalStorage(false)).toEqual({});
    });

    it('returns nothing when localStorage throws', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => { throw new Error('blocked'); });
      expect(getThemeValuesFromLocalStorage(false)).toEqual({});
    });

    it('ignores the stored choice when the theme switcher is hidden', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'dark' }));
      expect(getThemeValuesFromLocalStorage(true)).toEqual({});
    });
  });

  describe('getApiDocsTheme', () => {
    it('defaults to the default variant following the system mode', () => {
      expect(getApiDocsTheme()).toEqual({ variant: 'default', mode: 'system' });
    });

    it('uses the requested theme when nothing is stored', () => {
      expect(getApiDocsTheme({ variant: 'backstage', mode: 'light' })).toEqual({ variant: 'backstage', mode: 'light' });
    });

    it('a stored mode wins over the requested mode; the stored variant is ignored', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'backstage', mode: 'dark' }));
      expect(getApiDocsTheme({ mode: 'light' })).toEqual({ variant: 'default', mode: 'dark' });
    });

    it('uses the requested mode over a stored one when the theme switcher is hidden', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'dark' }));
      expect(getApiDocsTheme({ mode: 'light' }, true)).toEqual({ variant: 'default', mode: 'light' });
      expect(getApiDocsTheme(undefined, true)).toEqual({ variant: 'default', mode: 'system' });
    });
  });

  describe('getAppThemeMode', () => {
    it('passes explicit modes through', () => {
      expect(getAppThemeMode('light')).toBe('light');
      expect(getAppThemeMode('dark')).toBe('dark');
    });

    it('resolves system mode from the OS preference', () => {
      expect(getAppThemeMode('system')).toBe('light');
      stubOsPrefersDark();
      expect(getAppThemeMode('system')).toBe('dark');
    });
  });
});
