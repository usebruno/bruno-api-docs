import { describe, it, expect } from 'vitest';
import { mergeAuth, mergeHeaders } from './request-merger';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Folder, Item } from '@opencollection/types/collection/item';
import { getRequestAuth, getHttpHeaders } from '@/utils/schemaHelpers';

// A playground request keeps its auth on the http protocol block; folders/collection nest
// it under `request.auth`. Auth is either a concrete object, the string 'inherit', or
// undefined (= No Auth).
const httpRequest = (auth: unknown) => ({ http: { method: 'GET', url: 'https://x', auth } }) as unknown as HttpRequest;
const folder = (name: string, auth: unknown) => ({ info: { type: 'folder', name }, request: { auth } }) as unknown as Folder;
const collection = (auth: unknown) => ({ info: { name: 'C' }, request: { auth } }) as unknown as OpenCollection;

const BASIC = { type: 'basic', username: 'u', password: 'p' };
const BEARER = { type: 'bearer', token: 't' };
const APIKEY = { type: 'apikey', key: 'k', value: 'v', placement: 'header' };

// mergeAuth mutates the request; read back the effective auth the executor will use.
const resolve = (request: HttpRequest, coll: OpenCollection, path: Item[] = []): unknown => {
  mergeAuth(coll, request, path);
  return getRequestAuth(request);
};

describe('mergeHeaders (which headers a request ends up sending)', () => {
  type Row = { name: string; value: string; disabled?: boolean };

  const requestWith = (headers: Row[]) => ({ http: { method: 'GET', url: 'https://x', headers } }) as HttpRequest;
  const collectionWith = (headers: Row[]) => ({ info: { name: 'C' }, request: { headers } }) as OpenCollection;
  const folderWith = (name: string, headers: Row[]) =>
    ({ info: { type: 'folder', name }, request: { headers } }) as Folder;

  const sent = (request: HttpRequest): Record<string, string> =>
    Object.fromEntries(getHttpHeaders(request).map((header: Row) => [header.name.toLowerCase(), header.value]));

  it('sends a header the request inherits from the collection', () => {
    const request = requestWith([]);
    mergeHeaders(collectionWith([{ name: 'X-Token', value: 'from-collection' }]), request);

    expect(sent(request)['x-token']).toBe('from-collection');
  });

  it('lets the request override an inherited header of the same name', () => {
    const request = requestWith([{ name: 'X-Token', value: 'mine' }]);
    mergeHeaders(collectionWith([{ name: 'X-Token', value: 'from-collection' }]), request);

    expect(sent(request)['x-token']).toBe('mine');
  });

  it('still sends the inherited header when the request has switched its own copy off', () => {
    const request = requestWith([{ name: 'X-Token', value: 'mine', disabled: true }]);
    mergeHeaders(collectionWith([{ name: 'X-Token', value: 'from-collection' }]), request);

    expect(sent(request)['x-token']).toBe('from-collection');
  });

  it('does not send a header the collection has switched off', () => {
    const request = requestWith([]);
    mergeHeaders(collectionWith([{ name: 'X-Off', value: 'no', disabled: true }]), request);

    expect(sent(request)['x-off']).toBeUndefined();
  });

  it('prefers the closest folder over the collection for the same header', () => {
    const request = requestWith([]);
    mergeHeaders(
      collectionWith([{ name: 'X-Token', value: 'from-collection' }]),
      request,
      [folderWith('outer', [{ name: 'X-Token', value: 'from-outer' }]), folderWith('inner', [{ name: 'X-Token', value: 'from-inner' }])]
    );

    expect(sent(request)['x-token']).toBe('from-inner');
  });

  it('ignores a blank row rather than failing the whole merge', () => {
    const request = requestWith([]);
    mergeHeaders(collectionWith([{ name: '', value: 'nameless' }, { name: 'X-Keep', value: 'kept' }]), request);

    expect(sent(request)['x-keep']).toBe('kept');
  });
});

describe('mergeAuth (inherited-auth resolution for the playground send path)', () => {
  describe('acceptance #1 — a request set to inherit uses its nearest parent', () => {
    it('resolves from the collection when no folder configures auth', () => {
      expect(resolve(httpRequest('inherit'), collection(BEARER))).toMatchObject(BEARER);
    });

    it('prefers the closest folder over the collection', () => {
      const path = [folder('shallow', BASIC), folder('deep', APIKEY)]; // root -> leaf
      expect(resolve(httpRequest('inherit'), collection(BEARER), path)).toMatchObject(APIKEY);
    });
  });

  describe('acceptance #2 — a folder set to inherit resolves from its own parent chain', () => {
    it('is transparent and falls through to the collection', () => {
      expect(resolve(httpRequest('inherit'), collection(BASIC), [folder('F', 'inherit')])).toMatchObject(BASIC);
    });

    it('is transparent and falls through to a shallower concrete folder (not skipping past it to the collection)', () => {
      const path = [folder('outer', BEARER), folder('inner', 'inherit')];
      expect(resolve(httpRequest('inherit'), collection(BASIC), path)).toMatchObject(BEARER);
    });
  });

  describe('acceptance #3 — the resolved auth is applied for every supported mode', () => {
    for (const mode of [BASIC, BEARER, { type: 'apikey', key: 'k', value: 'v', placement: 'query' }]) {
      it(`applies inherited ${mode.type}`, () => {
        expect(resolve(httpRequest('inherit'), collection(mode))).toMatchObject(mode);
      });
    }
  });

  describe('acceptance #4 — an explicit No Auth is respected and never overridden by a parent', () => {
    it('leaves a request with its own concrete auth untouched, ignoring the parent', () => {
      const own = { type: 'bearer', token: 'own' };
      expect(resolve(httpRequest(own), collection(BASIC))).toMatchObject(own);
    });

    it('respects No Auth on the request itself against an authed collection', () => {
      expect(resolve(httpRequest(undefined), collection(BEARER), [folder('F', BASIC)])).toBeUndefined();
    });

    it('a folder set to No Auth blocks the collection auth for an inheriting request', () => {
      expect(resolve(httpRequest('inherit'), collection(BEARER), [folder('F', undefined)])).toBeUndefined();
    });

    it('the closest No-Auth level wins over a shallower concrete folder', () => {
      const path = [folder('outer', BEARER), folder('inner', undefined)]; // inner = No Auth, blocks
      expect(resolve(httpRequest('inherit'), collection(BASIC), path)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('falls back to No Auth when an inherit chain configures nothing concrete', () => {
      expect(resolve(httpRequest('inherit'), collection(undefined), [folder('F', 'inherit')])).toBeUndefined();
    });

    it('does not alias the shared collection/folder auth object into the per-run request', () => {
      const coll = collection(BEARER);
      const request = httpRequest('inherit');
      mergeAuth(coll, request, []);
      const applied = getRequestAuth(request) as unknown as typeof BEARER;
      expect(applied).toMatchObject(BEARER);
      expect(applied).not.toBe(BEARER); // cloned, not the same reference
      applied.token = 'mutated';
      expect(BEARER.token).toBe('t'); // mutation does not leak back to the collection
    });
  });

  // The resolver is mode-agnostic: it copies the whole auth object through by reference to its
  // shape, never switching on `auth.type`. These lock that in so a future auth type inherits with
  // no change here, and so nobody re-introduces a per-type branch that would break new types.
  describe('scalability — any auth type inherits without changes to the resolver', () => {
    it('resolves an unknown/future auth type through the chain, untouched', () => {
      const future = { type: 'future-scheme-v9', apiToken: 't', nested: { region: 'us' } };
      expect(resolve(httpRequest('inherit'), collection(future))).toMatchObject(future);
    });

    it('applies closest-folder-wins for an unknown type just like a known one', () => {
      const outer = { type: 'scheme-a', k: '1' };
      const inner = { type: 'scheme-b', k: '2' };
      const path = [folder('outer', outer), folder('inner', inner)];
      expect(resolve(httpRequest('inherit'), collection(undefined), path)).toMatchObject(inner);
    });

    it('deep-clones a nested auth shape so nothing aliases the shared source', () => {
      const source = {
        type: 'oauth2',
        grantType: 'client_credentials',
        additionalParameters: [{ name: 'scope', value: 'read' }]
      };
      const coll = collection(source);
      const request = httpRequest('inherit');
      mergeAuth(coll, request, []);
      const applied = getRequestAuth(request) as unknown as typeof source;
      expect(applied).toMatchObject({ type: 'oauth2', grantType: 'client_credentials' });
      expect(applied.additionalParameters).not.toBe(source.additionalParameters); // nested array cloned
      applied.additionalParameters[0].value = 'mutated';
      expect(source.additionalParameters[0].value).toBe('read'); // no leak into the collection
    });
  });
});
