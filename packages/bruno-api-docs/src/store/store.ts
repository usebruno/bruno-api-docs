import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/app';
import docsReducer from '@/store/slices/docs';
import envReducer from '@/store/slices/env';
import playgroundReducer from '@/store/slices/playground';
import type { EnvSession } from '@/session/env';

export const createOpenCollectionStore = ({ env }: { env?: EnvSession } = {}) => {
  const store = configureStore({
    reducer: {
      app: appReducer,
      docs: docsReducer,
      env: envReducer,
      playground: playgroundReducer
    }
  });

  store.subscribe(() => env?.setShowVars(store.getState().env.showVars));

  return store;
};

export type AppStore = ReturnType<typeof createOpenCollectionStore>;
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<AppStore['getState']>;
