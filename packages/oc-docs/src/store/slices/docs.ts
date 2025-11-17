import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, Folder } from '@opencollection/types/collection/item';
import type { RootState } from '../store';
import { hydrateWithUUIDs, findAndUpdateItem } from '../../utils/items';

export interface DocsState {
  collection: OpenCollectionCollection | null;
  selectedItemId: string | null;
}

const initialState: DocsState = {
  collection: null,
  selectedItemId: null
};

// Helper function to initialize isCollapsed for folders
const initializeCollapsedState = (items: OpenCollectionItem[] | undefined): void => {
  if (!items) return;
  
  for (const item of items) {
    if ('type' in item && item.type === 'folder') {
      // Initialize isCollapsed to true (collapsed) if not already set
      if ((item as any).isCollapsed === undefined) {
        (item as any).isCollapsed = true;
      }
      const folder = item as Folder;
      if (folder.items) {
        initializeCollapsedState(folder.items);
      }
    }
  }
};

const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    setDocsCollection: (state: DocsState, action: PayloadAction<OpenCollectionCollection | null>) => {
      // Hydrate collection with UUIDs if collection is provided
      const collection = action.payload ? hydrateWithUUIDs(action.payload) : null;
      state.collection = collection;
      // Initialize isCollapsed for all folders
      if (state.collection && state.collection.items) {
        initializeCollapsedState(state.collection.items);
      }
      // Reset selected item when collection changes
      state.selectedItemId = null;
    },
    clearDocsCollection: (state: DocsState) => {
      state.collection = null;
      state.selectedItemId = null;
    },
    toggleItem: (state: DocsState, action: PayloadAction<string>) => {
      const uuid = action.payload;
      if (state.collection && state.collection.items) {
        findAndUpdateItem(state.collection.items, uuid, (item) => {
          // Treat undefined as true (collapsed), then toggle
          const currentCollapsed = (item as any).isCollapsed ?? true;
          (item as any).isCollapsed = !currentCollapsed;
        });
      }
    },
    selectItem: (state: DocsState, action: PayloadAction<string | null>) => {
      state.selectedItemId = action.payload;
    },
  }
});

export const { setDocsCollection, clearDocsCollection, toggleItem, selectItem } = docsSlice.actions;
export default docsSlice.reducer;

export const selectDocsCollection = (state: RootState) => state.docs.collection;
export const selectSelectedItemId = (state: RootState) => state.docs.selectedItemId;


