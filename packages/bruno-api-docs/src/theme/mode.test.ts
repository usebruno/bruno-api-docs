import { describe, it, expect } from 'vitest';
import type { ThemeMode } from './types';
import { THEME_INFO, isThemeMode } from './mode';

const MODES = Object.keys(THEME_INFO) as ThemeMode[];

describe('theme mode helpers', () => {
  it('pairs each mode with its counterpart in the same family', () => {
    expect(THEME_INFO.light.counterpart).toBe('dark');
    expect(THEME_INFO.dark.counterpart).toBe('light');
    expect(THEME_INFO['backstage-light'].counterpart).toBe('backstage-dark');
    expect(THEME_INFO['backstage-dark'].counterpart).toBe('backstage-light');
  });

  it('keys every entry by its own mode', () => {
    MODES.forEach((mode) => expect(THEME_INFO[mode].mode).toBe(mode));
  });

  it('keeps counterparts symmetric and within one family with opposite brightness', () => {
    MODES.forEach((mode) => {
      const info = THEME_INFO[mode];
      const counterpart = THEME_INFO[info.counterpart];
      expect(counterpart.counterpart).toBe(mode);
      expect(counterpart.family).toBe(info.family);
      expect(counterpart.isDarkMode).toBe(!info.isDarkMode);
    });
  });

  it('groups modes into the default and backstage families', () => {
    expect(THEME_INFO.light.family).toBe('default');
    expect(THEME_INFO.dark.family).toBe('default');
    expect(THEME_INFO['backstage-light'].family).toBe('backstage');
    expect(THEME_INFO['backstage-dark'].family).toBe('backstage');
  });

  it('recognises only the known modes', () => {
    expect(isThemeMode('backstage-dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('sepia')).toBe(false);
    expect(isThemeMode('toString')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it('treats both dark variants as dark', () => {
    expect(THEME_INFO.dark.isDarkMode).toBe(true);
    expect(THEME_INFO['backstage-dark'].isDarkMode).toBe(true);
    expect(THEME_INFO.light.isDarkMode).toBe(false);
    expect(THEME_INFO['backstage-light'].isDarkMode).toBe(false);
  });
});
