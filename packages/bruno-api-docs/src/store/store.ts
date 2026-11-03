import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/app';
import docsReducer from '@/store/slices/docs';
import envReducer, { persistEnv } from '@/store/slices/env';
import playgroundReducer from '@/store/slices/playground';
import themeReducer from '@/store/slices/theme';
import { applyTheme } from '@/theme/applyTheme';
import type { ThemeState } from '@/theme/types';
import { isEqual } from 'lodash-es';

export interface CreateOpenCollectionStoreOptions {
  theme?: ThemeState;
}

export const createOpenCollectionStore = ({ theme }: CreateOpenCollectionStoreOptions = {}) => {
  const store = configureStore({
    reducer: {
      app: appReducer,
      docs: docsReducer,
      env: envReducer,
      playground: playgroundReducer,
      theme: themeReducer
    },
    ...(theme ? { preloadedState: { theme } } : {})
  });

  // Mirror theme changes to the root data-theme attribute outside the reducer.
  let lastStateTheme = store.getState().theme;
  applyTheme(lastStateTheme);
  let lastEnv = store.getState().env;
  store.subscribe(() => {
    const state = store.getState();
    const themeState = state.theme;
    if (!isEqual(lastStateTheme, themeState)) {
      lastStateTheme = themeState;
      applyTheme(themeState);
    }
    if (state.env !== lastEnv) {
      lastEnv = state.env;
      persistEnv(state.env);
    }
  });

  return store;
};

export type AppStore = ReturnType<typeof createOpenCollectionStore>;
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<AppStore['getState']>;
