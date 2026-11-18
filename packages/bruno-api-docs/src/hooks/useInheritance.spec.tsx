import React from 'react';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Item } from '@opencollection/types/collection/item';
import { renderToStaticMarkup } from 'react-dom/server';
import { useInheritance } from './useInheritance';
import { COLLECTION_ROOT_CRUMB } from '@/utils/common';
import { folderSource, getInheritedConfig } from '@/utils/request';
import type { SupportedRequestItem } from '@/utils/schemaHelpers';

type InheritanceData = ReturnType<typeof useInheritance>;

let captured: InheritanceData;

const Harness: React.FC<{ item: SupportedRequestItem; collection?: OpenCollection | null; ancestry?: Item[] }> = ({
  item,
  collection = null,
  ancestry = []
}) => {
  captured = useInheritance(collection, ancestry, item);
  return null;
};

const dataFor = (
  item: SupportedRequestItem,
  collection: OpenCollection | null = null,
  ancestry: Item[] = []
): InheritanceData => {
  renderToStaticMarkup(<Harness item={item} collection={collection} ancestry={ancestry} />);
  return captured;
};

const request = (auth?: unknown, headers?: { name: string; value?: string; disabled?: boolean }[]): HttpRequest =>
  ({ info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x', auth, headers } }) as unknown as HttpRequest;

const collectionWith = (requestDefaults: Record<string, unknown>): OpenCollection =>
  ({ info: { name: 'Billing API', version: '1.0.0' }, request: requestDefaults }) as unknown as OpenCollection;

const folder = (name: string, auth?: unknown): Item =>
  ({ uuid: `f-${name}`, info: { name, type: 'folder' }, request: { auth } }) as unknown as Item;

const headerNames = (data: InheritanceData) => data.effectiveHeaders.map((h) => h.name);

describe('useInheritance', () => {
  describe('auth', () => {
    it('reports no inherited auth when the request sets its own auth or none', () => {
      const own = { type: 'apikey', key: 'k', value: 'v' };
      const concrete = dataFor(request(own));
      expect(concrete.inheritedAuth).toBeNull();
      expect(concrete.effectiveAuth).toEqual(own);
      expect(dataFor(request()).inheritedAuth).toBeNull();
    });

    it('resolves an inherited auth to the collection bearer through transparent folders', () => {
      const bearer = { type: 'bearer', token: 'collection-token' };
      const data = dataFor(request('inherit'), collectionWith({ auth: bearer }), [folder('billing', 'inherit')]);
      expect(data.inheritedAuth).toEqual({
        auth: bearer,
        source: { level: 'collection', name: 'Billing API', uuid: COLLECTION_ROOT_CRUMB }
      });
      expect(data.effectiveAuth).toEqual(bearer);
    });

    it('falls back to the collection as the source when nothing up the chain sets auth', () => {
      const data = dataFor(request('inherit'), collectionWith({}));
      expect(data.inheritedAuth).toEqual({
        auth: undefined,
        source: { level: 'collection', name: 'Billing API', uuid: COLLECTION_ROOT_CRUMB }
      });
      expect(data.effectiveAuth).toBeUndefined();
      expect(data.resolvedAuth.source).toBeUndefined();
    });

    it('names the source "Collection" when there is no collection', () => {
      expect(dataFor(request('inherit')).inheritedAuth?.source.name).toBe('Collection');
    });

    it('stops at a No Auth folder and reports it as the source', () => {
      const noAuthFolder = folder('public');
      const data = dataFor(
        request('inherit'),
        collectionWith({ auth: { type: 'bearer', token: 't' } }),
        [noAuthFolder]
      );
      expect(data.inheritedAuth).toEqual({ auth: undefined, source: folderSource(noAuthFolder) });
      expect(data.effectiveAuth).toBeUndefined();
    });
  });

  describe('inherited config', () => {
    it('passes through the inherited headers and variables from getInheritedConfig', () => {
      const collection = collectionWith({
        headers: [
          { name: 'X-Overridden', value: 'c' },
          { name: 'X-Shadowed', value: 'c' },
          { name: 'X-Collection', value: 'c' }
        ],
        variables: [{ name: 'colVar', value: 'cv' }]
      });
      const item = request(undefined, [
        { name: 'X-Overridden', value: 'own' },
        { name: 'X-Shadowed', value: 'own', disabled: true }
      ]);
      const data = dataFor(item, collection);
      const expected = getInheritedConfig(collection, [], item);
      expect(data.inheritedHeaders).toEqual(expected.headers);
      expect(data.inheritedPreVars).toEqual(expected.preVars);
      expect(data.inheritedPostVars).toEqual(expected.postVars);
      expect(data.inheritedHeaders.map((h) => h.name)).toEqual(['X-Shadowed', 'X-Collection']);
    });
  });

  describe('effectiveHeaders', () => {
    it('lists own headers first, then inherited ones', () => {
      const data = dataFor(
        request(undefined, [{ name: 'X-Own', value: '1' }]),
        collectionWith({ headers: [{ name: 'X-Collection', value: 'c' }] })
      );
      expect(headerNames(data)).toEqual(['X-Own', 'X-Collection']);
    });

    it('passes an own disabled header through and drops a disabled inherited one', () => {
      const data = dataFor(
        request(undefined, [{ name: 'X-Off', value: 'o', disabled: true }]),
        collectionWith({ headers: [{ name: 'X-Inherited-Off', value: 'c', disabled: true }] })
      );
      expect(data.effectiveHeaders).toEqual([{ name: 'X-Off', value: 'o', disabled: true }]);
    });

    it('maps an inherited header with no value to an empty string', () => {
      const data = dataFor(request(), collectionWith({ headers: [{ name: 'X-Empty' }] }));
      expect(data.effectiveHeaders).toEqual([{ name: 'X-Empty', value: '', disabled: undefined }]);
    });

    describe('when the auth does not write an Authorization header', () => {
      const modes: [string, unknown][] = [
        ['apikey', { type: 'apikey', key: 'X-Api-Key', value: 'k', placement: 'header' }],
        ['digest', { type: 'digest', username: 'u', password: 'p' }],
        ['bearer with an empty token', { type: 'bearer', token: '' }],
        ['basic with no password', { type: 'basic', username: 'u', password: '' }]
      ];

      modes.forEach(([label, auth]) => {
        it(`keeps an own Authorization header under ${label}`, () => {
          const data = dataFor(request(auth, [{ name: 'Authorization', value: 'Custom own' }]));
          expect(headerNames(data)).toEqual(['Authorization']);
        });

        it(`keeps an inherited Authorization header under ${label}`, () => {
          const data = dataFor(
            request(auth),
            collectionWith({ headers: [{ name: 'Authorization', value: 'Custom collection' }] })
          );
          expect(headerNames(data)).toEqual(['Authorization']);
        });
      });
    });

    describe('when the auth writes an Authorization header', () => {
      const modes = [
        { type: 'bearer', token: 't' },
        { type: 'basic', username: 'u', password: 'p' }
      ];

      modes.forEach((auth) => {
        it(`drops own and inherited Authorization headers under ${auth.type}`, () => {
          const own = dataFor(request(auth, [{ name: 'Authorization', value: 'stale' }, { name: 'X-Own', value: '1' }]));
          expect(headerNames(own)).toEqual(['X-Own']);

          const inherited = dataFor(
            request(auth),
            collectionWith({ headers: [{ name: 'Authorization', value: 'stale' }, { name: 'X-Collection', value: 'c' }] })
          );
          expect(headerNames(inherited)).toEqual(['X-Collection']);
        });
      });

      it('matches the Authorization header name case-insensitively', () => {
        const data = dataFor(request({ type: 'bearer', token: 't' }, [{ name: 'authorization', value: 'stale' }]));
        expect(data.effectiveHeaders).toEqual([]);
      });

      it('drops an own Authorization header when the bearer auth is inherited from the collection', () => {
        const data = dataFor(
          request('inherit', [{ name: 'Authorization', value: 'stale' }]),
          collectionWith({ auth: { type: 'bearer', token: 't' } })
        );
        expect(data.effectiveHeaders).toEqual([]);
      });
    });
  });
});
