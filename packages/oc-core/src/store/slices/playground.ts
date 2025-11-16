import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { RootState } from '../store';

export interface PlaygroundState {
  collection: OpenCollectionCollection | null;
}

const initialState: PlaygroundState = {
  collection: null
};

const playgroundSlice = createSlice({
  name: 'playground',
  initialState,
  reducers: {
    setPlaygroundCollection: (state: PlaygroundState, action: PayloadAction<OpenCollectionCollection | null>) => {
      state.collection = action.payload;
    },
    clearPlaygroundCollection: (state: PlaygroundState) => {
      state.collection = null;
    },
  }
});

export const { setPlaygroundCollection, clearPlaygroundCollection } = playgroundSlice.actions;
export default playgroundSlice.reducer;

export const selectPlaygroundCollection = (state: RootState) => state.playground.collection;


