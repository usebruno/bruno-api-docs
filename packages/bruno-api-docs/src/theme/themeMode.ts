import { isEqual } from 'lodash-es';
import { createObservable, persisted } from '@/observable/observable';
import { DEFAULT_THEME_MODE, DEFAULT_THEME_VARIANT, THEME_STORAGE_KEY } from '@/constants/theme';
import { applyTheme } from './applyTheme';
import type { ThemeState } from './types';

export const createThemeMode = (initial: ThemeState = { variant: DEFAULT_THEME_VARIANT, mode: DEFAULT_THEME_MODE }) => {
  const saved = persisted<ThemeState>('localStorage', THEME_STORAGE_KEY);
  const state = createObservable({ initial });
  applyTheme(initial);

  return {
    get: state.get,
    subscribe: state.subscribe,
    set: (next: ThemeState) => {
      if (isEqual(next, state.get())) return;
      applyTheme(next);
      state.set(next);
    },
    toggle: (fromDark: boolean) => {
      const next: ThemeState = { ...state.get(), mode: fromDark ? 'light' : 'dark' };
      applyTheme(next);
      state.set(next);
      saved.write(next);
    }
  };
};
