import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { THEME_INFO } from '@/theme/mode';
import type { ThemeMode } from '@/theme/types';
import reducer, {
  setTheme,
  toggleTheme,
  getInitialThemeState,
  persistThemeMode,
  getStateForMode,
  getDefaultThemeState,
  THEME_STORAGE_KEY
} from './theme';
import { selectTheme } from './docs';
import type { RootState } from '../store';

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

describe('themeSlice', () => {
  beforeEach(() => localStorage.clear());
  // Restore (leave the localStorage stub from beforeAll intact).
  afterEach(() => vi.stubGlobal('window', undefined));

  it('defaults to light when nothing persisted', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(THEME_INFO.light);
  });

  it('setTheme replaces the whole state with the target mode info (pure, no side effects)', () => {
    expect(reducer(THEME_INFO.light, setTheme('dark'))).toEqual(THEME_INFO.dark);
    expect(reducer(THEME_INFO.light, setTheme('backstage-dark'))).toEqual(THEME_INFO['backstage-dark']);
    // reducer must not touch localStorage
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('setTheme switches family as well as brightness', () => {
    const next = reducer(THEME_INFO['backstage-dark'], setTheme('light'));
    expect(next.family).toBe('default');
    expect(next.counterpart).toBe('dark');
    expect(next.isDarkMode).toBe(false);
  });

  it('setTheme with an unknown mode falls back to the default state', () => {
    expect(reducer(THEME_INFO.dark, setTheme('sepia' as ThemeMode))).toEqual(THEME_INFO.light);
  });

  it('toggle flips mode', () => {
    expect(reducer(THEME_INFO.light, toggleTheme())).toEqual(THEME_INFO.dark);
    expect(reducer(THEME_INFO.dark, toggleTheme())).toEqual(THEME_INFO.light);
  });

  it('toggle stays within the backstage family', () => {
    expect(reducer(THEME_INFO['backstage-light'], toggleTheme())).toEqual(THEME_INFO['backstage-dark']);
    expect(reducer(THEME_INFO['backstage-dark'], toggleTheme())).toEqual(THEME_INFO['backstage-light']);
  });

  it('toggling twice returns to the starting mode', () => {
    const once = reducer(THEME_INFO['backstage-light'], toggleTheme());
    expect(reducer(once, toggleTheme())).toEqual(THEME_INFO['backstage-light']);
  });

  it('persistThemeMode writes the mode to localStorage', () => {
    persistThemeMode('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  describe('getInitialThemeState', () => {
    it('returns the stored choice when no theme is requested', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialThemeState()).toEqual(THEME_INFO.dark);
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(getInitialThemeState()).toEqual(THEME_INFO.light);
    });

    it('ignores an unrecognised stored value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
      expect(getInitialThemeState()).toEqual(THEME_INFO.light);

      stubOsPrefersDark();
      expect(getInitialThemeState()).toEqual(THEME_INFO.dark);
    });

    it('falls back to the OS preference when localStorage throws', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => { throw new Error('blocked'); });
      stubOsPrefersDark();
      expect(getInitialThemeState()).toEqual(THEME_INFO.dark);
    });

    it('a stored choice wins over the OS preference', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      stubOsPrefersDark();
      expect(getInitialThemeState()).toEqual(THEME_INFO.light);
    });

    it('falls back to the OS preference when nothing is stored', () => {
      // No window/matchMedia (node) -> default light.
      expect(getInitialThemeState()).toEqual(THEME_INFO.light);

      // OS prefers dark -> dark.
      stubOsPrefersDark();
      expect(getInitialThemeState()).toEqual(THEME_INFO.dark);
    });

    it('ignores a stored backstage mode when no theme is requested', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
      expect(getInitialThemeState()).toEqual(THEME_INFO.light);
    });

    it('uses the requested mode when nothing is stored, regardless of the OS preference', () => {
      stubOsPrefersDark();
      expect(getInitialThemeState('backstage-light')).toEqual(THEME_INFO['backstage-light']);
      expect(getInitialThemeState('light')).toEqual(THEME_INFO.light);
    });

    it('keeps a stored choice from the requested family', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
      expect(getInitialThemeState('backstage-light')).toEqual(THEME_INFO['backstage-dark']);
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialThemeState('light')).toEqual(THEME_INFO.dark);
    });

    it('ignores a stored choice from another family in favour of the requested mode', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialThemeState('backstage-light')).toEqual(THEME_INFO['backstage-light']);
      localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
      expect(getInitialThemeState('light')).toEqual(THEME_INFO.light);
    });
  });

  it('getDefaultThemeState follows the OS preference within the default family', () => {
    expect(getDefaultThemeState()).toEqual(THEME_INFO.light);
    stubOsPrefersDark();
    expect(getDefaultThemeState()).toEqual(THEME_INFO.dark);
  });

  it('getStateForMode maps known modes and falls back for anything else', () => {
    expect(getStateForMode('backstage-light')).toEqual(THEME_INFO['backstage-light']);
    expect(getStateForMode(null)).toEqual(THEME_INFO.light);
    expect(getStateForMode('toString')).toEqual(THEME_INFO.light);
  });

  it('selectTheme exposes the theme slice', () => {
    const state = { theme: THEME_INFO['backstage-dark'] } as unknown as RootState;
    expect(selectTheme(state).isDarkMode).toBe(true);
    expect(selectTheme(state).mode).toBe('backstage-dark');
  });
});
