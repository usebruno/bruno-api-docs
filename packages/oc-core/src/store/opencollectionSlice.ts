import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ActionReducerMapBuilder, PayloadAction } from '@reduxjs/toolkit';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import { parseYaml } from '../utils/yamlUtils';
import type { RootState } from './store';

export type CollectionSource = OpenCollectionCollection | string | File;

interface OpenCollectionState {
  data: OpenCollectionCollection | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OpenCollectionState = {
  data: null,
  status: 'idle',
  error: null,
};

const loadOpenCollectionData = async (source: string | File): Promise<OpenCollectionCollection> => {
  let content: string;

  if (typeof File !== 'undefined' && source instanceof File) {
    content = await source.text();
  } else if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`);
      }
      content = await response.text();
    } else {
      content = source;
    }
  } else {
    throw new Error('Invalid source type for collection');
  }

  try {
    return parseYaml(content) as OpenCollectionCollection;
  } catch (yamlError) {
    try {
      return JSON.parse(content) as OpenCollectionCollection;
    } catch (jsonError) {
      throw new Error('Failed to parse collection as YAML or JSON');
    }
  }
};

export const loadCollection = createAsyncThunk<OpenCollectionCollection, CollectionSource>(
  'opencollection/loadCollection',
  async (collection: CollectionSource) => {
    if (typeof File !== 'undefined' && collection instanceof File) {
      return loadOpenCollectionData(collection);
    }

    if (typeof collection === 'string') {
      return loadOpenCollectionData(collection);
    }

    return collection;
  }
);

const opencollectionSlice = createSlice({
  name: 'opencollection',
  initialState,
  reducers: {
    setCollection: (state: OpenCollectionState, action: PayloadAction<OpenCollectionCollection | null>) => {
      state.data = action.payload;
      state.status = action.payload ? 'succeeded' : 'idle';
      state.error = null;
    },
    clearCollection: (state: OpenCollectionState) => {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<OpenCollectionState>) => {
    builder
      .addCase(loadCollection.pending, (state: OpenCollectionState) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCollection.fulfilled, (state: OpenCollectionState, action: PayloadAction<OpenCollectionCollection>) => {
        state.data = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(loadCollection.rejected, (state: OpenCollectionState, action: ReturnType<typeof loadCollection.rejected>) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load API collection';
      });
  },
});

export const { setCollection, clearCollection } = opencollectionSlice.actions;
export default opencollectionSlice.reducer;

export const selectCollectionData = (state: RootState) => state.opencollection.data;
export const selectCollectionStatus = (state: RootState) => state.opencollection.status;
export const selectCollectionError = (state: RootState) => state.opencollection.error;

