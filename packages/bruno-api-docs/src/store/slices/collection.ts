import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection } from '@opencollection/types';
import type { Item, Folder } from '@opencollection/types/collection/item';
import { hydrateWithUUIDs, findAndUpdateItem } from '@/utils/fileUtils';
import { isFolder } from '@/utils/schemaHelpers';

export type CollectionStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

// The document every surface reads. Loaded once by CollectionRoot; the playground
// forks its own working copy from it and never writes back.
export interface CollectionState {
  document: OpenCollection | null;
  status: CollectionStatus;
  error: string | null;
  gitCollectionUrl: string | null;
}

const initialState: CollectionState = {
  document: null,
  status: 'idle',
  error: null,
  gitCollectionUrl: null
};

const initializeCollapsedState = (items: Item[] | undefined): void => {
  if (!items) return;
  for (const item of items) {
    if (isFolder(item)) {
      if ((item as any).isCollapsed === undefined) {
        (item as any).isCollapsed = true;
      }
      const folder = item as Folder;
      if (folder.items) initializeCollapsedState(folder.items);
    }
  }
};

const collectionSlice = createSlice({
  name: 'collection',
  initialState,
  reducers: {
    collectionLoading: (state: CollectionState) => {
      state.status = 'loading';
      state.error = null;
    },
    collectionLoaded: (state: CollectionState, action: PayloadAction<OpenCollection>) => {
      const document = hydrateWithUUIDs(action.payload);
      initializeCollapsedState(document.items);
      state.document = document;
      state.status = 'succeeded';
      state.error = null;
    },
    collectionFailed: (state: CollectionState, action: PayloadAction<string>) => {
      state.document = null;
      state.status = 'failed';
      state.error = action.payload;
    },
    collectionCleared: (state: CollectionState) => {
      state.document = null;
      state.status = 'idle';
      state.error = null;
    },
    setGitCollectionUrl: (state: CollectionState, action: PayloadAction<string | null>) => {
      state.gitCollectionUrl = action.payload;
    },
    // Sidebar expansion still rides on the tree nodes. Moving it to a side table
    // keyed by uuid is the remaining step that makes the document read-only.
    toggleItem: (state: CollectionState, action: PayloadAction<string>) => {
      if (!state.document?.items) return;
      findAndUpdateItem(state.document.items, action.payload, (item) => {
        const currentCollapsed = (item as any).isCollapsed ?? true;
        (item as any).isCollapsed = !currentCollapsed;
      });
    },
    // Expand-only: reveal the active item's ancestors without fighting a folder
    // the user closed by hand.
    expandFolders: (state: CollectionState, action: PayloadAction<string[]>) => {
      if (!state.document?.items || action.payload.length === 0) return;
      for (const uuid of new Set(action.payload)) {
        findAndUpdateItem(state.document.items, uuid, (item) => {
          (item as { isCollapsed?: boolean }).isCollapsed = false;
        });
      }
    }
  }
});

export const {
  collectionLoading,
  collectionLoaded,
  collectionFailed,
  collectionCleared,
  setGitCollectionUrl,
  toggleItem,
  expandFolders
} = collectionSlice.actions;
export default collectionSlice.reducer;

type WithCollection = { collection: CollectionState };
export const selectCollection = (state: WithCollection) => state.collection.document;
export const selectCollectionStatus = (state: WithCollection) => state.collection.status;
export const selectCollectionError = (state: WithCollection) => state.collection.error;
export const selectGitCollectionUrl = (state: WithCollection) => state.collection.gitCollectionUrl;
