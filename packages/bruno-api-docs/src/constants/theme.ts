import type { ThemeFamily, ThemeMode } from '@/theme/types';

export const THEME_STORAGE_KEY = 'oc-docs.theme';
export const SUPPORTED_THEMES_FAMILY: Set<ThemeFamily> = new Set(['default', 'backstage']);
export const SUPPORTED_THEME_MODE: Set<ThemeMode> = new Set(['light', 'dark', 'system']);
export const DEFAULT_THEME_FAMILY: ThemeFamily = 'default';
export const DEFAULT_THEME_MODE: ThemeMode = 'system';
