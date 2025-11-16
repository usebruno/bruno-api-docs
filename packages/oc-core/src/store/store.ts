import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@slices/app';
import docsReducer from '@slices/docs';
import playgroundReducer from '@slices/playground';

export const createOpenCollectionStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      docs: docsReducer,
      playground: playgroundReducer,
    },
  });

export type AppStore = ReturnType<typeof createOpenCollectionStore>;
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<AppStore['getState']>;

