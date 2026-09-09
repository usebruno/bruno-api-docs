import { configureStore, type ReducersMapObject, type StateFromReducersMapObject } from '@reduxjs/toolkit';
import collectionReducer from '@/store/slices/collection';
import envReducer, { persistEnv } from '@/store/slices/env';
import themeReducer, { persistThemeMode } from '@/store/slices/theme';

// What every surface may read. A surface's own slice is registered by the root
// that mounts it and is typed by that surface, never here.
const coreReducers = {
  collection: collectionReducer,
  env: envReducer,
  theme: themeReducer
};

export type RootState = StateFromReducersMapObject<typeof coreReducers>;

export const createOpenCollectionStore = <S extends ReducersMapObject = Record<never, never>>(surfaces?: S) => {
  const store = configureStore({
    reducer: { ...coreReducers, ...surfaces }
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
