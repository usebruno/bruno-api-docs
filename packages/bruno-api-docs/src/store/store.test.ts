import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { setTheme, setThemeMode } from '@/store/slices/theme';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import { createOpenCollectionStore } from './store';

const root = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };

beforeAll(() => {
  let store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; }
  });
});

describe('createOpenCollectionStore theme seeding', () => {
  beforeEach(() => {
    localStorage.clear();
    root.attrs = {};
    vi.stubGlobal('document', { documentElement: root });
  });
  afterEach(() => vi.stubGlobal('document', undefined));

  it('starts in the requested theme with no dispatch', () => {
    const store = createOpenCollectionStore({ theme: { variant: 'backstage', mode: 'dark' } });
    expect(store.getState().theme).toEqual({ variant: 'backstage', mode: 'dark' });
  });

  it('defaults to the default variant following the system mode, ignoring a stored mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ variant: 'default', mode: 'dark' }));
    expect(createOpenCollectionStore().getState().theme).toEqual({ variant: 'default', mode: 'system' });
  });

  it('sets data-theme to the initial theme on creation', () => {
    createOpenCollectionStore({ theme: { variant: 'backstage', mode: 'light' } });
    expect(root.attrs['data-theme']).toBe('backstage-light');
  });

  it('does not persist the initial theme over the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    createOpenCollectionStore({ theme: { variant: 'backstage', mode: 'light' } });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('applies a theme change to data-theme', () => {
    const store = createOpenCollectionStore({ theme: { variant: 'backstage', mode: 'light' } });
    store.dispatch(setThemeMode('dark'));
    expect(root.attrs['data-theme']).toBe('backstage-dark');

    store.dispatch(setTheme({ variant: 'default', mode: 'light' }));
    expect(root.attrs['data-theme']).toBe('default-light');
  });

  it('never writes the theme to localStorage itself', () => {
    const store = createOpenCollectionStore({ theme: { variant: 'backstage', mode: 'light' } });
    store.dispatch(setThemeMode('dark'));
    store.dispatch(setTheme({ variant: 'default', mode: 'light' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
