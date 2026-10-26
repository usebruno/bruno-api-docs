import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode, ThemeState } from '@/theme/types';
import { getApiDocsTheme } from '@/utils/theme';
import { RootState } from '../store';

const themeSlice = createSlice({
  name: 'theme',
  initialState: () => getApiDocsTheme(),
  reducers: {
    setTheme(_state, action: PayloadAction<ThemeState>) {
      return action.payload;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      return {
        ...state,
        mode: action.payload
      };
    }
  }
});

export const { setTheme, setThemeMode } = themeSlice.actions;
export default themeSlice.reducer;

export const selectTheme = (state: RootState) => state.theme;
