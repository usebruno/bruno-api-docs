import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import {
  getApiDocsTheme,
  getAppThemeMode,
  getInitializerThemeValue,
  getThemeValuesFromLocalStorage,
  isDarkMode
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

  describe('getInitializerThemeValue', () => {
    it('keeps only supported family and mode values', () => {
      expect(getInitializerThemeValue({ family: 'backstage', mode: 'dark' })).toEqual({ family: 'backstage', mode: 'dark' });
      expect(getInitializerThemeValue({ family: 'sepia', mode: 'dim' })).toEqual({ family: undefined, mode: undefined });
    });

    it('ignores anything that is not a plain object', () => {
      expect(getInitializerThemeValue('backstage-dark')).toBeUndefined();
      expect(getInitializerThemeValue(null)).toBeUndefined();
      expect(getInitializerThemeValue(['dark'])).toBeUndefined();
    });
  });

  describe('getThemeValuesFromLocalStorage', () => {
    it('returns nothing when nothing is stored', () => {
      expect(getThemeValuesFromLocalStorage()).toEqual({});
    });

    it('reads the stored JSON theme state', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'backstage', mode: 'dark' }));
      expect(getThemeValuesFromLocalStorage()).toEqual({ family: 'backstage', mode: 'dark' });
    });

    it('reads the legacy bare mode string', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getThemeValuesFromLocalStorage()).toEqual({ mode: 'dark' });
    });

    it('drops unrecognised or malformed stored values', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'default', mode: 'sepia' }));
      expect(getThemeValuesFromLocalStorage()).toEqual({ family: 'default', mode: undefined });
      localStorage.setItem(THEME_STORAGE_KEY, 'null');
      expect(getThemeValuesFromLocalStorage()).toEqual({});
      localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
      expect(getThemeValuesFromLocalStorage()).toEqual({});
    });

    it('returns nothing when localStorage throws', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => { throw new Error('blocked'); });
      expect(getThemeValuesFromLocalStorage()).toEqual({});
    });
  });

  describe('getApiDocsTheme', () => {
    it('defaults to the default family following the system mode', () => {
      expect(getApiDocsTheme()).toEqual({ family: 'default', mode: 'system' });
    });

    it('uses the requested theme when nothing is stored', () => {
      expect(getApiDocsTheme({ family: 'backstage', mode: 'light' })).toEqual({ family: 'backstage', mode: 'light' });
    });

    it('a stored mode wins over the requested mode; the stored family is ignored', () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'backstage', mode: 'dark' }));
      expect(getApiDocsTheme({ mode: 'light' })).toEqual({ family: 'default', mode: 'dark' });
    });
  });

  describe('getAppThemeMode / isDarkMode', () => {
    it('passes explicit modes through', () => {
      expect(getAppThemeMode('light')).toBe('light');
      expect(getAppThemeMode('dark')).toBe('dark');
      expect(isDarkMode('dark')).toBe(true);
    });

    it('resolves system mode from the OS preference', () => {
      expect(getAppThemeMode('system')).toBe('light');
      stubOsPrefersDark();
      expect(getAppThemeMode('system')).toBe('dark');
      expect(isDarkMode('system')).toBe(true);
    });
  });
});
