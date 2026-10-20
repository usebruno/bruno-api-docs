import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { THEME_INFO } from '@/theme/mode';
import { setTheme, toggleTheme, THEME_STORAGE_KEY } from '@/store/slices/theme';
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
    const store = createOpenCollectionStore({ theme: 'backstage-dark' });
    expect(store.getState().theme).toEqual(THEME_INFO['backstage-dark']);
  });

  it('starts in the stored choice when it belongs to the requested family', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
    const store = createOpenCollectionStore({ theme: 'backstage-light' });
    expect(store.getState().theme.mode).toBe('backstage-dark');
  });

  it('defaults to the default family when no theme is requested', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'backstage-dark');
    expect(createOpenCollectionStore().getState().theme).toEqual(THEME_INFO.light);
  });

  it('sets data-theme to the initial mode on creation', () => {
    createOpenCollectionStore({ theme: 'backstage-light' });
    expect(root.attrs['data-theme']).toBe('backstage-light');
  });

  it('does not persist the initial theme over the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    createOpenCollectionStore({ theme: 'backstage-light' });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('persists and applies a theme change', () => {
    const store = createOpenCollectionStore({ theme: 'backstage-light' });
    store.dispatch(toggleTheme());
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('backstage-dark');
    expect(root.attrs['data-theme']).toBe('backstage-dark');

    store.dispatch(setTheme('light'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(root.attrs['data-theme']).toBe('light');
  });
});
