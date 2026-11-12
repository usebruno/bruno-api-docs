import { configureStore } from '@reduxjs/toolkit';
import docsReducer from '@/store/slices/docs';
import playgroundReducer from '@/store/slices/playground';

export const createOpenCollectionStore = () =>
  configureStore({
    reducer: {
      docs: docsReducer,
      playground: playgroundReducer
    }
  });

export type AppStore = ReturnType<typeof createOpenCollectionStore>;
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<AppStore['getState']>;
