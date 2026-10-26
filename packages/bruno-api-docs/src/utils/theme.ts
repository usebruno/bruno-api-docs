import type { ResolvedThemeMode, ThemeVariant, ThemeMode, ThemeState } from '@/theme/types';
import { isPlainObject } from 'lodash-es';
import { DEFAULT_THEME_VARIANT, DEFAULT_THEME_MODE, SUPPORTED_THEME_VARIANTS, SUPPORTED_THEME_MODES, THEME_STORAGE_KEY } from '@/constants/theme';

export const isThemeVariant = (value: unknown): value is ThemeVariant =>
  typeof value === 'string' && SUPPORTED_THEME_VARIANTS.has(value as ThemeVariant);

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
 * The theme to start with. The variant always comes from the host. The mode is
 * the reader's saved choice, then the host's, then `'system'`, except with the
 * theme switcher hidden, where the reader can't change it, so storage is never
 * read and the host's mode (or `'system'`) is used.
 */
export function getApiDocsTheme(
  hostThemeValues?: Partial<ThemeState>,
  themeSwitcherHidden: boolean = false
): ThemeState {
  const {
    variant: hostThemeVariant,
    mode: hostThemeMode
  } = getThemeStateFrom(hostThemeValues);
  const { mode: localStorageThemeMode } = getThemeValuesFromLocalStorage(themeSwitcherHidden);
  return {
    variant: hostThemeVariant ?? DEFAULT_THEME_VARIANT,
    mode: (themeSwitcherHidden ? undefined : localStorageThemeMode) ?? hostThemeMode ?? DEFAULT_THEME_MODE
  };
}

export function getThemeStateFrom(value: unknown): Partial<ThemeState> {
  if (!isPlainObject(value)) {
    return {};
  }

  const { variant: variantValue, mode: modeValue } = value as Partial<ThemeState>;

  return {
    variant: isThemeVariant(variantValue) ? variantValue : undefined,
    mode: isThemeMode(modeValue) ? modeValue : undefined
  };
}

export function getThemeValuesFromLocalStorage(themeSwitcherHidden: boolean): Partial<ThemeState> {
  if (themeSwitcherHidden) {
    return {}
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
