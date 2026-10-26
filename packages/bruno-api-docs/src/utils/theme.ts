import type { ResolvedThemeMode, ThemeFamily, ThemeMode, ThemeState } from '@/theme/types';
import { isPlainObject } from 'lodash-es';
import { DEFAULT_THEME_FAMILY, DEFAULT_THEME_MODE, SUPPORTED_THEME_FAMILIES, SUPPORTED_THEME_MODES, THEME_STORAGE_KEY } from '@/constants/theme';

export const isThemeFamily = (value: unknown): value is ThemeFamily =>
  typeof value === 'string' && SUPPORTED_THEME_FAMILIES.has(value as ThemeFamily);

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && SUPPORTED_THEME_MODES.has(value as ThemeMode);

export function systemPrefersDark(): boolean {
  try {
    return (
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  } catch {
    return false;
  }
}

export function getAppThemeMode(mode: ThemeMode): ResolvedThemeMode {
  return mode !== 'system' ? mode : systemPrefersDark() ? 'dark' : 'light';
}

/**
 * The theme to start with. The family always comes from the host. The mode is
 * the reader's saved choice, then the host's, then `'system'`, except with the
 * theme switcher hidden, where the reader can't change it, so storage is never
 * read and the host's mode (or `'system'`) is used.
 */
export function getApiDocsTheme(
  initializerThemeValues?: Partial<ThemeState>,
  themeSwitcherHidden: boolean = false
): ThemeState {
  const {
    family: initializerThemeFamily,
    mode: initializerThemeMode
  } = getThemeStateFrom(initializerThemeValues);
  const { mode: localStorageThemeMode } = getThemeValuesFromLocalStorage(themeSwitcherHidden);
  return {
    family: initializerThemeFamily ?? DEFAULT_THEME_FAMILY,
    mode: localStorageThemeMode ?? initializerThemeMode ?? DEFAULT_THEME_MODE
  };
}

export function getThemeStateFrom(value: unknown): Partial<ThemeState> {
  if (!isPlainObject(value)) {
    return {};
  }

  const { family: familyValue, mode: modeValue } = value as Partial<ThemeState>;

  return {
    family: isThemeFamily(familyValue) ? familyValue : undefined,
    mode: isThemeMode(modeValue) ? modeValue : undefined
  };
}

export function getThemeValuesFromLocalStorage(themeSwitcherHidden: boolean): Partial<ThemeState> {
  if (themeSwitcherHidden) {
    return {};
  }
  let value;
  try {
    value = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // No storage (SSR / Node) or access blocked by the browser.
    return {};
  }
  if (value === null) return {};

  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Legacy format: the bare mode string ('light' / 'dark').
  }
  if (isThemeMode(parsed)) return { mode: parsed };
  return getThemeStateFrom(parsed);
}

export const persistThemeState = (themeState: ThemeState) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeState));
  } catch {
    /* ignore */
  }
};

export const isDarkMode = (themeMode: ThemeMode) => getAppThemeMode(themeMode) === 'dark';
