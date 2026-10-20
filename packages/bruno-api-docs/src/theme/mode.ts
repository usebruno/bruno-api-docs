import type { ThemeFamily, ThemeMode } from '@/theme/types';

export interface ThemeInfo {
  family: ThemeFamily;
  mode: ThemeMode;
  counterpart: ThemeMode;
  isDarkMode: boolean;
}

export const THEME_INFO: Record<ThemeMode, ThemeInfo> = {
  'light': {
    family: 'default',
    mode: 'light',
    counterpart: 'dark',
    isDarkMode: false
  },
  'dark': {
    family: 'default',
    mode: 'dark',
    counterpart: 'light',
    isDarkMode: true
  },
  'backstage-light': {
    family: 'backstage',
    mode: 'backstage-light',
    counterpart: 'backstage-dark',
    isDarkMode: false
  },
  'backstage-dark': {
    family: 'backstage',
    mode: 'backstage-dark',
    counterpart: 'backstage-light',
    isDarkMode: true
  }
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEME_INFO, value);

