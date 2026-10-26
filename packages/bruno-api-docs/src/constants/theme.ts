import type { ThemeVariant, ThemeMode } from '@/theme/types';

export const THEME_STORAGE_KEY = 'oc-docs.theme';
export const SUPPORTED_THEME_VARIANTS: Set<ThemeVariant> = new Set(['default', 'backstage']);
export const SUPPORTED_THEME_MODES: Set<ThemeMode> = new Set(['light', 'dark', 'system']);
export const DEFAULT_THEME_VARIANT: ThemeVariant = 'default';
export const DEFAULT_THEME_MODE: ThemeMode = 'system';
