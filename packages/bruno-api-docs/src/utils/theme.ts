import type { ThemeFamily, ThemeMode, ThemeState } from '@/theme/types';
import { isPlainObject } from 'lodash-es';
import { applyTheme } from '@/theme/applyTheme';
import { DEFAULT_THEME_FAMILY, DEFAULT_THEME_MODE, SUPPORTED_THEME_MODE, SUPPORTED_THEMES_FAMILY, THEME_STORAGE_KEY } from '@/constants/theme';

export const isThemeFamily = (value: unknown): value is ThemeFamily =>
  typeof value === 'string' && SUPPORTED_THEMES_FAMILY.has(value as ThemeFamily);

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && SUPPORTED_THEME_MODE.has(value as ThemeMode);

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

export function getAppThemeMode(mode: ThemeMode): Exclude<ThemeMode, 'system'> {
  return mode !== 'system' ? mode : systemPrefersDark() ? 'dark' : 'light';
}

export function getApiDocsTheme(initializerThemeValues?: Partial<ThemeState>) {
  const {
    family: initializerThemeFamily,
    mode: initializerThemeMode
  } = getInitializerThemeValue(initializerThemeValues) ?? {};
  const { mode: localStorageThemeMode } = getThemeValuesFromLocalStorage();
  return {
    family: initializerThemeFamily ?? DEFAULT_THEME_FAMILY,
    mode: localStorageThemeMode ?? initializerThemeMode ?? DEFAULT_THEME_MODE
  };
}

export function getInitializerThemeValue(initializerThemeValues: unknown): Partial<ThemeState> | undefined {
  if (
    initializerThemeValues === undefined
    || initializerThemeValues === null
    || !isPlainObject(initializerThemeValues)
  ) {
    return undefined;
  }

  const familyValue = (initializerThemeValues as Partial<ThemeState>)?.family;
  const modeValue = (initializerThemeValues as Partial<ThemeState>)?.mode;

  return {
    family: isThemeFamily(familyValue) ? familyValue : undefined,
    mode: isThemeMode(modeValue) ? modeValue : undefined
  };
}

export function getThemeValuesFromLocalStorage(): Partial<ThemeState> {
  let value: string | null;
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
  return {}
}

/**
 * Side effect: mirror the active mode to localStorage + the root `data-theme`
 * attribute. Kept out of the reducers (which must stay pure) — call this from
 * the store subscription instead (see store.ts).
 */
export const persistThemeMode = (themeState: ThemeState) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeState));
  } catch {
    /* ignore */
  }
  applyTheme(themeState);
};

export const isDarkMode = (themeMode: ThemeMode) => getAppThemeMode(themeMode) === 'dark';
