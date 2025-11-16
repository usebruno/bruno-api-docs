import { configureStore } from '@reduxjs/toolkit';
import opencollectionReducer from './opencollectionSlice';

export const createOpenCollectionStore = () =>
  configureStore({
    reducer: {
      opencollection: opencollectionReducer,
    },
  });

export type AppStore = ReturnType<typeof createOpenCollectionStore>;
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<AppStore['getState']>;

