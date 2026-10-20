import type { ThemeMode } from '@/theme/types';

/** The opposite-brightness mode within the same theme family. */
export const COUNTERPART_MODE: Record<ThemeMode, ThemeMode> = {
  'light': 'dark',
  'dark': 'light',
  'backstage-light': 'backstage-dark',
  'backstage-dark': 'backstage-light'
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(COUNTERPART_MODE, value);

export const isDarkMode = (mode: ThemeMode): boolean => mode === 'dark' || mode === 'backstage-dark';
