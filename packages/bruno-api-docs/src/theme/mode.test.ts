import { describe, it, expect } from 'vitest';
import { COUNTERPART_MODE, isDarkMode, isThemeMode } from './mode';

describe('theme mode helpers', () => {
  it('pairs each mode with its counterpart in the same family', () => {
    expect(COUNTERPART_MODE.light).toBe('dark');
    expect(COUNTERPART_MODE.dark).toBe('light');
    expect(COUNTERPART_MODE['backstage-light']).toBe('backstage-dark');
    expect(COUNTERPART_MODE['backstage-dark']).toBe('backstage-light');
  });

  it('recognises only the known modes', () => {
    expect(isThemeMode('backstage-dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('sepia')).toBe(false);
    expect(isThemeMode('toString')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it('treats both dark variants as dark', () => {
    expect(isDarkMode('dark')).toBe(true);
    expect(isDarkMode('backstage-dark')).toBe(true);
    expect(isDarkMode('light')).toBe(false);
    expect(isDarkMode('backstage-light')).toBe(false);
  });
});
