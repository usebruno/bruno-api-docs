import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { RootState } from '@/store/store';
import { hydrateWithUUIDs } from '@/utils/fileUtils';

export interface DocsState {
  collection: OpenCollectionCollection | null;
  selectedItemId: string | null;
}

const initialState: DocsState = {
  collection: null,
  selectedItemId: null
};

const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    setDocsCollection: (state: DocsState, action: PayloadAction<OpenCollectionCollection | null>) => {
      // Hydrate collection with UUIDs if collection is provided
      const collection = action.payload ? hydrateWithUUIDs(action.payload) : null;
      state.collection = collection;
      // Reset selected item when collection changes
      state.selectedItemId = null;
    },
    clearDocsCollection: (state: DocsState) => {
      state.collection = null;
      state.selectedItemId = null;
    },
    selectItem: (state: DocsState, action: PayloadAction<string | null>) => {
      state.selectedItemId = action.payload;
    }
  }
});

export const { setDocsCollection, clearDocsCollection, selectItem } = docsSlice.actions;
export default docsSlice.reducer;

export const selectDocsCollection = (state: RootState) => state.docs.collection;
export const selectSelectedItemId = (state: RootState) => state.docs.selectedItemId;
