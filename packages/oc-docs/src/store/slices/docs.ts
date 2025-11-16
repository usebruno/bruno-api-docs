import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { RootState } from '../store';

export interface DocsState {
  collection: OpenCollectionCollection | null;
}

const initialState: DocsState = {
  collection: null
};

const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    setDocsCollection: (state: DocsState, action: PayloadAction<OpenCollectionCollection | null>) => {
      state.collection = action.payload;
    },
    clearDocsCollection: (state: DocsState) => {
      state.collection = null;
    },
  }
});

export const { setDocsCollection, clearDocsCollection } = docsSlice.actions;
export default docsSlice.reducer;

export const selectDocsCollection = (state: RootState) => state.docs.collection;


