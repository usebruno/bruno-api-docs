import { isEqual } from 'lodash-es';
import { createObservable, persisted } from '@/observable/observable';
import { DEFAULT_THEME_MODE, DEFAULT_THEME_VARIANT, THEME_STORAGE_KEY } from '@/constants/theme';
import { isDarkMode } from '@/utils/theme';
import { applyTheme } from './applyTheme';
import type { ThemeState } from './types';

export const createThemeMode = (initial: ThemeState = { variant: DEFAULT_THEME_VARIANT, mode: DEFAULT_THEME_MODE }) => {
  const saved = persisted<ThemeState>('localStorage', THEME_STORAGE_KEY);
  const state = createObservable({ initial, onChange: applyTheme });
  const apply = () => applyTheme(state.get());
  apply();

  return {
    get: state.get,
    subscribe: state.subscribe,
    apply,
    set: (next: ThemeState) => {
      if (!isEqual(next, state.get())) state.set(next);
    },
    toggle: () => {
      const current = state.get();
      const next: ThemeState = { ...current, mode: isDarkMode(current.mode) ? 'light' : 'dark' };
      state.set(next);
      saved.write(next);
    }
  };
};

export type ThemeModeStore = ReturnType<typeof createThemeMode>;
