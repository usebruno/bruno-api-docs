import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, Folder } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { RootState } from '../store';

export interface PlaygroundState {
  collection: OpenCollectionCollection | null;
}

const initialState: PlaygroundState = {
  collection: null
};

const findAndUpdateItemInCollection = (
  items: OpenCollectionItem[] | undefined,
  uuid: string,
  updatedItem: HttpRequest
): boolean => {
  if (!items) return false;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemUuid = (item as any).uuid;
    
    if (itemUuid === uuid) {
      // Preserve UUID when updating
      items[i] = { ...updatedItem, uuid: itemUuid } as any;
      return true;
    }
    
    if ('type' in item && item.type === 'folder') {
      const folder = item as Folder;
      if (folder.items && findAndUpdateItemInCollection(folder.items, uuid, updatedItem)) {
        return true;
      }
    }
  }
  
  return false;
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
    updatePlaygroundItem: (state: PlaygroundState, action: PayloadAction<{ uuid: string; item: HttpRequest }>) => {
      if (!state.collection || !state.collection.items) return;
      
      const { uuid, item } = action.payload;
      findAndUpdateItemInCollection(state.collection.items, uuid, item);
    },
  }
});

export const { setPlaygroundCollection, clearPlaygroundCollection, updatePlaygroundItem } = playgroundSlice.actions;
export default playgroundSlice.reducer;

export const selectPlaygroundCollection = (state: RootState) => state.playground.collection;


