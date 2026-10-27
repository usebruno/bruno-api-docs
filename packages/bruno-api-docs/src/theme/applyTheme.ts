import { getAppThemeMode } from '@/utils/theme';
import type { ThemeState } from './types';

/** Mirror the active mode to the root element's data-theme attribute. */
export function applyTheme({ variant, mode }: ThemeState): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(
    'data-theme',
    `${variant}-${getAppThemeMode(mode)}`
  );
}
