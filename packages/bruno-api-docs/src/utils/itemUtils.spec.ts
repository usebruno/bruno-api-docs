import { describe, it, expect } from 'vitest';
import { filterItems } from './itemUtils';

const request = (uuid: string, name: string): any => ({ uuid, type: 'http', name });
const folder = (uuid: string, name: string, items: any[], isCollapsed = true): any => ({
  uuid,
  type: 'folder',
  name,
  isCollapsed,
  items
});

// Auth
//   ├─ Login
//   └─ Tokens
//        └─ Refresh
// Users
//   └─ Get Users
const buildTree = () => [
  folder('auth', 'Auth', [request('login', 'Login'), folder('tokens', 'Tokens', [request('refresh', 'Refresh')])]),
  folder('users', 'Users', [request('get-users', 'Get Users')])
];

const names = (items: any[]): any[] =>
  items.map((item) => (item.type === 'folder' ? { [item.name]: names(item.items) } : item.name));

describe('filterItems', () => {
  it('keeps a matched request with the folders leading to it and drops everything else', () => {
    const result = filterItems(buildTree(), new Set(['login']), new Set());
    expect(names(result)).toEqual([{ Auth: ['Login'] }]);
  });

  it('keeps a deeply nested match with its whole folder path', () => {
    const result = filterItems(buildTree(), new Set(['refresh']), new Set());
    expect(names(result)).toEqual([{ Auth: [{ Tokens: ['Refresh'] }] }]);
  });

  it('keeps everything inside a folder whose own name matched', () => {
    const result = filterItems(buildTree(), new Set(['auth']), new Set());
    expect(names(result)).toEqual([{ Auth: ['Login', { Tokens: ['Refresh'] }] }]);
  });

  it('returns an empty list when nothing matched', () => {
    expect(filterItems(buildTree(), new Set(['missing']), new Set())).toEqual([]);
  });

  it('shows every kept folder open, even ones that were collapsed in the tree', () => {
    const [auth] = filterItems(buildTree(), new Set(['auth']), new Set());
    expect((auth as any).isCollapsed).toBe(false);
    expect((auth as any).items[1].isCollapsed).toBe(false);
  });

  it('closes the folders in closedIds, including a subfolder inside a matched folder', () => {
    const [auth] = filterItems(buildTree(), new Set(['auth']), new Set(['tokens']));
    expect((auth as any).isCollapsed).toBe(false);
    expect((auth as any).items[1].isCollapsed).toBe(true);
  });

  it('does not change the original tree', () => {
    const tree = buildTree();
    filterItems(tree, new Set(['login']), new Set());
    expect(names(tree)).toEqual(names(buildTree()));
    expect(tree[0].isCollapsed).toBe(true);
  });
});
