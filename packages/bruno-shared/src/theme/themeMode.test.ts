import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../constants/theme';
import { fakeStorage } from '../test-utils/storage';
import { createThemeMode } from './themeMode';

const root = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };

describe('createThemeMode', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
    root.attrs = {};
    vi.stubGlobal('document', { documentElement: root });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts in the requested theme', () => {
    expect(createThemeMode({ variant: 'backstage', mode: 'dark' }).get()).toEqual({ variant: 'backstage', mode: 'dark' });
  });

  it('defaults to the default variant following the system mode, ignoring a stored mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'dark' }));
    expect(createThemeMode().get()).toEqual({ variant: 'default', mode: 'system' });
  });

  it('sets data-theme to the initial theme on creation', () => {
    createThemeMode({ variant: 'backstage', mode: 'light' });
    expect(root.attrs['data-theme']).toBe('backstage-light');
  });

  it('does not persist the initial theme over the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    createThemeMode({ variant: 'backstage', mode: 'light' });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('set replaces the whole theme, applies it to data-theme and notifies subscribers', () => {
    const theme = createThemeMode({ variant: 'backstage', mode: 'light' });
    const listener = vi.fn();
    theme.subscribe(listener);

    theme.set({ variant: 'default', mode: 'dark' });

    expect(theme.get()).toEqual({ variant: 'default', mode: 'dark' });
    expect(root.attrs['data-theme']).toBe('default-dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('set with an equal theme changes nothing', () => {
    const theme = createThemeMode({ variant: 'backstage', mode: 'light' });
    const listener = vi.fn();
    theme.subscribe(listener);
    root.attrs = {};

    theme.set({ variant: 'backstage', mode: 'light' });

    expect(listener).not.toHaveBeenCalled();
    expect(root.attrs['data-theme']).toBeUndefined();
  });

  it('set never writes the theme to localStorage', () => {
    createThemeMode({ variant: 'backstage', mode: 'light' }).set({ variant: 'default', mode: 'dark' });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('toggle flips light and dark, keeps the variant, applies it and saves the whole theme', () => {
    const theme = createThemeMode({ variant: 'backstage', mode: 'light' });

    theme.toggle(false);
    expect(theme.get()).toEqual({ variant: 'backstage', mode: 'dark' });
    expect(root.attrs['data-theme']).toBe('backstage-dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(JSON.stringify({ variant: 'backstage', mode: 'dark' }));

    theme.toggle(true);
    expect(theme.get()).toEqual({ variant: 'backstage', mode: 'light' });
  });

  it('toggle from system goes to the opposite of what the system shows', () => {
    const theme = createThemeMode({ variant: 'default', mode: 'system' });
    theme.toggle(false);
    expect(theme.get().mode).toBe('dark');
  });

  it('toggle follows what the button showed, even if the system changed since it rendered', () => {
    const theme = createThemeMode({ variant: 'default', mode: 'system' });
    theme.toggle(true);
    expect(theme.get().mode).toBe('light');
  });
});
