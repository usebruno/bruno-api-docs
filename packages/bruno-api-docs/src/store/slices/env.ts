import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { readPersistedEnv } from '@/session/env';

const envSlice = createSlice({
  name: 'env',
  initialState: { showVars: readPersistedEnv().showVars },
  reducers: {
    setShowVars(state, action: PayloadAction<boolean>) {
      state.showVars = action.payload;
    },
    toggleShowVars(state) {
      state.showVars = !state.showVars;
    }
  }
});

export const { setShowVars, toggleShowVars } = envSlice.actions;

export const selectShowVars = (state: RootState): boolean => state.env.showVars;

export default envSlice.reducer;
