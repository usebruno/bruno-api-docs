import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '@/theme/types';
import type { ThemeInfo } from '@/theme/mode';
import { isThemeMode, THEME_INFO } from '@/theme/mode';

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

export const readPersistedMode = (): ThemeState => {
  // An explicit user choice always wins.
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return getStateForMode(v);
  } catch {
    /* ignore */
  }
  // Nothing persisted yet -> follow the OS preference, default light.
  return getDefaultThemeState();
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
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
  }
};

// Seed from the persisted value so the very first render (Monaco theme, toggle
// icon, anything reading s.theme.mode) is already correct — no light->dark flash.
const initialState: ThemeState = readPersistedMode();

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state = getStateForMode(action.payload);
    },
    toggleTheme(state) {
      state = getStateForMode(state.counterpart);
    }
  }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
