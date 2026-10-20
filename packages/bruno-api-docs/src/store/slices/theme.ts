import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '@/theme/types';
import type { ThemeInfo } from '@/theme/mode';
import { isThemeMode, THEME_INFO } from '@/theme/mode';
import { applyTheme } from '@/theme/applyTheme';

export const THEME_STORAGE_KEY = 'oc-docs.theme';
export type ThemeState = ThemeInfo;

const systemPrefersDark = (): boolean => {
  try {
    return (
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  } catch {
    return false;
  }
};

export function getDefaultThemeState() {
  return systemPrefersDark() ? THEME_INFO['dark'] : THEME_INFO['light'];
}

const readStoredMode = (): ThemeMode | null => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(v) ? v : null;
  } catch {
    return null;
  }
};

export const getInitialThemeState = (requested?: ThemeMode): ThemeState => {
  const family = requested ? THEME_INFO[requested].family : 'default';
  const stored = readStoredMode();
  if (stored && THEME_INFO[stored].family === family) return THEME_INFO[stored];
  return requested ? THEME_INFO[requested] : getDefaultThemeState();
};

export function getStateForMode(mode: unknown): ThemeState {
  if (isThemeMode(mode)) return THEME_INFO[mode];
  return getDefaultThemeState();
}

/**
 * Side effect: mirror the active mode to localStorage + the root `data-theme`
 * attribute. Kept out of the reducers (which must stay pure) — call this from
 * the store subscription instead (see store.ts).
 */
export const persistThemeMode = (mode: ThemeMode) => {
  if (!isThemeMode(mode)) {
    return;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: () => getInitialThemeState(),
  reducers: {
    setTheme(_state, action: PayloadAction<ThemeMode>) {
      return getStateForMode(action.payload);
    },
    toggleTheme(state) {
      return getStateForMode(state.counterpart);
    }
  }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
