import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode, ThemeState } from '@/theme/types';
import { DEFAULT_THEME_VARIANT, DEFAULT_THEME_MODE } from '@/constants/theme';
import type { RootState } from '@/store/store';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    variant: DEFAULT_THEME_VARIANT,
    mode: DEFAULT_THEME_MODE
  },
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
