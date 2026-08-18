import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/app';
import docsReducer from '@/store/slices/docs';
import envReducer, { persistEnv } from '@/store/slices/env';
import playgroundReducer from '@/store/slices/playground';
import themeReducer, { persistThemeMode } from '@/store/slices/theme';

export const createOpenCollectionStore = () => {
  const store = configureStore({
    reducer: {
      app: appReducer,
      docs: docsReducer,
      env: envReducer,
      playground: playgroundReducer,
      theme: themeReducer
    }
  });

  // Persist theme changes (localStorage + root data-theme) outside the reducer.
  let lastMode = store.getState().theme.mode;
  // Persist the environment selection (sessionStorage) outside the reducer.
  let lastEnv = store.getState().env;
  store.subscribe(() => {
    const state = store.getState();
    const mode = state.theme.mode;
    if (mode !== lastMode) {
      lastMode = mode;
      persistThemeMode(mode);
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
