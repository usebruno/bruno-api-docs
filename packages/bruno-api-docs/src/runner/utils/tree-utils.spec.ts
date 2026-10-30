import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Item } from '@opencollection/types/collection/item';
import { getTreePathFromCollectionToItem, findItemByPath, findScriptFileByPath } from './tree-utils';
import { getItemName } from '@/utils/schemaHelpers';

// Two requests that are byte-identical in name+method+url but live in different folders. Only the
// hydrated uuid tells them apart, so the ancestor walk must key on uuid — content matching would
// resolve whichever copy appears first in tree order and inherit the wrong folder's auth.
const request = (uuid: string): any => ({
  uuid,
  info: { type: 'http', name: 'Get User' },
  http: { method: 'GET', url: 'https://api.example.com/users' }
});
const folder = (uuid: string, name: string, child: any): any => ({
  uuid,
  info: { type: 'folder', name },
  items: [child]
});

describe('getTreePathFromCollectionToItem', () => {
  it('resolves the ancestor chain by uuid so duplicate requests map to their own folder', () => {
    const inA = request('req-a');
    const inB = request('req-b');
    const collection: any = { items: [folder('folder-a', 'A', inA), folder('folder-b', 'B', inB)] };

    // Content matching would return ['A'] for both copies; uuid keeps them distinct.
    expect(getTreePathFromCollectionToItem(collection, inA).map(getItemName)).toEqual(['A']);
    expect(getTreePathFromCollectionToItem(collection, inB).map(getItemName)).toEqual(['B']);
  });

  it('falls back to content matching when the target carries no uuid (unhydrated input)', () => {
    const req = { info: { type: 'http', name: 'Solo' }, http: { method: 'GET', url: 'https://x' } };
    const collection: any = { items: [{ info: { type: 'folder', name: 'F' }, items: [req] }] };
    expect(getTreePathFromCollectionToItem(collection, req as any).map(getItemName)).toEqual(['F']);
  });
});

describe('findItemByPath', () => {
  const httpReq = (name: string): HttpRequest =>
    ({ info: { type: 'http', name }, http: { method: 'GET', url: `https://x/${name}` } });
  const folderOf = (name: string, items: Item[]): Item => ({ info: { type: 'folder', name }, items } as Item);
  const collectionOf = (items: Item[]): OpenCollection => ({ items } as OpenCollection);

  const login = httpReq('Login');
  const health = httpReq('Health');
  const collection = collectionOf([folderOf('Auth', [login]), health]);

  it('finds a top-level request by name and a nested request by folder/name path', () => {
    expect(findItemByPath(collection, 'Health')).toBe(health);
    expect(findItemByPath(collection, 'Auth/Login')).toBe(login);
  });

  it('does not find a nested request by a bare name — the full path is required (desktop-app parity)', () => {
    expect(findItemByPath(collection, 'Login')).toBeNull();
    expect(findItemByPath(collection, 'Auth/Login')).toBe(login);
  });

  it('ignores a leading slash and a carried-over file extension', () => {
    expect(findItemByPath(collection, '/Auth/Login.bru')).toBe(login);
    expect(findItemByPath(collection, 'Health.yml')).toBe(health);
  });

  it('returns null for an unknown path, a non-folder mid-segment, or an empty path', () => {
    expect(findItemByPath(collection, 'Nope')).toBeNull();
    expect(findItemByPath(collection, 'Auth/Nope')).toBeNull();
    expect(findItemByPath(collection, 'Health/Sub')).toBeNull();
    expect(findItemByPath(collection, '')).toBeNull();
  });
});

describe('findScriptFileByPath', () => {
  const scriptOf = (name: string, script: string): Item =>
    ({ info: { type: 'script', name }, script } as unknown as Item);
  const folderOf = (name: string, items: Item[]): Item => ({ info: { type: 'folder', name }, items } as Item);
  const httpReq = (name: string): Item =>
    ({ info: { type: 'http', name }, http: { method: 'GET', url: `https://x/${name}` } } as Item);

  const collection = {
    items: [
      folderOf('billing', [scriptOf('Script', 'module.exports = 1;'), httpReq('Invoices')]),
      scriptOf('helpers', 'module.exports = 2;')
    ]
  } as OpenCollection;

  it('finds a script by its path from the collection root, with or without ./, / and .js', () => {
    expect(findScriptFileByPath(collection, './billing/Script.js')).toEqual({ found: true, code: 'module.exports = 1;' });
    expect(findScriptFileByPath(collection, 'billing/Script')).toEqual({ found: true, code: 'module.exports = 1;' });
    expect(findScriptFileByPath(collection, 'helpers.js')).toEqual({ found: true, code: 'module.exports = 2;' });
    expect(findScriptFileByPath(collection, '/billing/Script.js')).toEqual({ found: true, code: 'module.exports = 1;' });
  });

  it('finds a folder by the name Bruno desktop gives it on disk', () => {
    const withColon = { items: [folderOf('Auth: Login', [scriptOf('token', 'module.exports = 3;')])] } as OpenCollection;
    expect(findScriptFileByPath(withColon, './Auth- Login/token.js')).toEqual({ found: true, code: 'module.exports = 3;' });
    expect(findScriptFileByPath(withColon, './Auth: Login/token.js')).toEqual({ found: true, code: 'module.exports = 3;' });
  });

  it('ignores letter case only when no exact name matches', () => {
    const cased = {
      items: [
        folderOf('billing', [scriptOf('Script', 'module.exports = 1;'), scriptOf('script', 'module.exports = 2;')]),
        folderOf('Billing', [scriptOf('Script', 'module.exports = 3;')])
      ]
    } as OpenCollection;
    expect(findScriptFileByPath(cased, './BILLING/SCRIPT.js')).toEqual({ found: true, code: 'module.exports = 1;' });
    expect(findScriptFileByPath(cased, './billing/script.js')).toEqual({ found: true, code: 'module.exports = 2;' });
    expect(findScriptFileByPath(cased, './Billing/Script.js')).toEqual({ found: true, code: 'module.exports = 3;' });
  });

  it('follows .. as long as the path stays inside the collection', () => {
    expect(findScriptFileByPath(collection, './billing/../helpers.js')).toEqual({ found: true, code: 'module.exports = 2;' });
  });

  it('refuses a path that leaves the collection root', () => {
    expect(findScriptFileByPath(collection, '../helpers.js')).toEqual({ found: false, reason: 'outside-collection' });
    expect(findScriptFileByPath(collection, 'billing/../../helpers.js'))
      .toEqual({ found: false, reason: 'outside-collection' });
  });

  it('reports not-found for a missing file, a request, a folder or an empty path', () => {
    expect(findScriptFileByPath(collection, './billing/Nope.js')).toEqual({ found: false, reason: 'not-found' });
    expect(findScriptFileByPath(collection, './billing/Invoices')).toEqual({ found: false, reason: 'not-found' });
    expect(findScriptFileByPath(collection, './billing')).toEqual({ found: false, reason: 'not-found' });
    expect(findScriptFileByPath(collection, '')).toEqual({ found: false, reason: 'not-found' });
    const withUnnamedScript = { items: [{ type: 'script', script: 'module.exports = 3;' }] } as unknown as OpenCollection;
    expect(findScriptFileByPath(withUnnamedScript, './')).toEqual({ found: false, reason: 'not-found' });
  });

  it('returns the code as it is now, so an edit made in the playground is picked up', () => {
    const script = scriptOf('live', 'module.exports = "old";');
    const edited = { items: [script] } as OpenCollection;
    (script as { script?: string }).script = 'module.exports = "new";';
    expect(findScriptFileByPath(edited, './live.js')).toEqual({ found: true, code: 'module.exports = "new";' });
  });
});
