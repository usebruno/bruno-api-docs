import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/app';
import docsReducer from '@/store/slices/docs';
import envReducer, { persistEnv } from '@/store/slices/env';
import playgroundReducer from '@/store/slices/playground';

export const createOpenCollectionStore = () => {
  const store = configureStore({
    reducer: {
      app: appReducer,
      docs: docsReducer,
      env: envReducer,
      playground: playgroundReducer
    }
  });

  let lastEnv = store.getState().env;
  store.subscribe(() => {
    const state = store.getState();
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
