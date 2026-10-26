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
    const store = createOpenCollectionStore({ theme: { family: 'backstage', mode: 'dark' } });
    expect(store.getState().theme).toEqual({ family: 'backstage', mode: 'dark' });
  });

  it('defaults to the default family following the system mode, ignoring a stored mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'default', mode: 'dark' }));
    expect(createOpenCollectionStore().getState().theme).toEqual({ family: 'default', mode: 'system' });
  });

  it('sets data-theme to the initial theme on creation', () => {
    createOpenCollectionStore({ theme: { family: 'backstage', mode: 'light' } });
    expect(root.attrs['data-theme']).toBe('backstage-light');
  });

  it('does not persist the initial theme over the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    createOpenCollectionStore({ theme: { family: 'backstage', mode: 'light' } });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('applies a theme change to data-theme', () => {
    const store = createOpenCollectionStore({ theme: { family: 'backstage', mode: 'light' } });
    store.dispatch(setThemeMode('dark'));
    expect(root.attrs['data-theme']).toBe('backstage-dark');

    store.dispatch(setTheme({ family: 'default', mode: 'light' }));
    expect(root.attrs['data-theme']).toBe('default-light');
  });

  it('never writes the theme to localStorage itself', () => {
    const store = createOpenCollectionStore({ theme: { family: 'backstage', mode: 'light' } });
    store.dispatch(setThemeMode('dark'));
    store.dispatch(setTheme({ family: 'default', mode: 'light' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
