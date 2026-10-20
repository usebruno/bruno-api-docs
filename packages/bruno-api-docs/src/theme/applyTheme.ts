import type { ThemeMode } from '@/theme/types';

/** Mirror the active mode to the root element's data-theme attribute. */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
}
