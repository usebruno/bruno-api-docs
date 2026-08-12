import React from 'react';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Item } from '@opencollection/types/collection/item';
import { renderToStaticMarkup } from 'react-dom/server';
import { useRequestPageData, type RequestPageData } from './useRequestPageData';
import type { SupportedRequestItem } from '@/utils/schemaHelpers';

let captured: RequestPageData;

const Harness: React.FC<{ item: SupportedRequestItem; collection?: OpenCollection | null; ancestry?: Item[] }> = ({
  item,
  collection = null,
  ancestry = []
}) => {
  captured = useRequestPageData(collection, ancestry, item);
  return null;
};

const dataFor = (
  item: SupportedRequestItem,
  collection: OpenCollection | null = null,
  ancestry: Item[] = []
): RequestPageData => {
  renderToStaticMarkup(<Harness item={item} collection={collection} ancestry={ancestry} />);
  return captured;
};

const folder = (name: string, uuid = `f-${name}`): Item =>
  ({ uuid, info: { name, type: 'folder' } }) as unknown as Item;

describe('useRequestPageData', () => {
  describe('name and url', () => {
    it('reads the item name and url', () => {
      const data = dataFor({
        info: { name: 'Login', type: 'http' },
        http: { method: 'post', url: '{{baseUrl}}/auth/login' }
      } as HttpRequest);
      expect(data.name).toBe('Login');
      expect(data.url).toBe('{{baseUrl}}/auth/login');
    });

    it('falls back to "Untitled Request" when the item has no name', () => {
      const data = dataFor({ info: { type: 'http' }, http: { method: 'get', url: '/x' } } as unknown as HttpRequest);
      expect(data.name).toBe('Untitled Request');
    });
  });

  describe('path and query params', () => {
    it('splits declared params into path and query and reports hasParams', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http' },
        http: {
          method: 'get',
          url: '{{baseUrl}}/users/:id',
          params: [
            { name: 'id', value: '42', type: 'path' },
            { name: 'active', value: 'true', type: 'query' }
          ]
        }
      } as HttpRequest);
      expect(data.pathParams.map((p) => p.name)).toContain('id');
      expect(data.queryParams.map((p) => p.name)).toContain('active');
      expect(data.hasParams).toBe(true);
    });

    it('reports hasParams=false when there are no params', () => {
      const data = dataFor({ info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest);
      expect(data.pathParams).toHaveLength(0);
      expect(data.queryParams).toHaveLength(0);
      expect(data.hasParams).toBe(false);
    });
  });

  describe('descHtml', () => {
    it('renders docs to html', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http' },
        http: { method: 'get', url: '/x' },
        docs: '# Title'
      } as unknown as HttpRequest);
      expect(data.descHtml).toContain('<h1');
      expect(data.descHtml).toContain('Title');
    });

    it('falls back to the description when there are no docs', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http', description: 'Plain description.' },
        http: { method: 'get', url: '/x' }
      } as HttpRequest);
      expect(data.descHtml).toContain('Plain description.');
    });

    it('prefers docs over description', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http', description: 'the description' },
        http: { method: 'get', url: '/x' },
        docs: 'the docs'
      } as unknown as HttpRequest);
      expect(data.descHtml).toContain('the docs');
      expect(data.descHtml).not.toContain('the description');
    });

    it('is empty when there are no docs or description', () => {
      const data = dataFor({ info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest);
      expect(data.descHtml).toBe('');
    });
  });

  describe('auth', () => {
    it('exposes a concrete own auth as ownAuth and effectiveAuth, with showAuth and no source', () => {
      const auth = { type: 'bearer', token: 'own-token' };
      const data = dataFor({
        info: { name: 'R', type: 'http' },
        http: { method: 'get', url: '/x', auth }
      } as unknown as HttpRequest);
      expect(data.ownAuth).toEqual(auth);
      expect(data.effectiveAuth).toEqual(auth);
      expect(data.showAuth).toBe(true);
      expect(data.authSource).toBeUndefined();
    });

    it('resolves an inherited auth to the collection auth and reports its source', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { auth: { type: 'bearer', token: 'collection-token' } }
      } as unknown as OpenCollection;
      const data = dataFor(
        { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x', auth: 'inherit' } } as unknown as HttpRequest,
        collection
      );
      expect(data.ownAuth).toBe('inherit');
      expect(data.effectiveAuth).toMatchObject({ type: 'bearer', token: 'collection-token' });
      expect(data.showAuth).toBe(true);
      expect(data.authSource).toBeDefined();
    });

    it('reports no auth when the item has none', () => {
      const data = dataFor({ info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest);
      expect(data.ownAuth).toBeUndefined();
      expect(data.effectiveAuth).toBeUndefined();
      expect(data.showAuth).toBe(false);
      expect(data.authSource).toBeUndefined();
    });
  });

  describe('variables', () => {
    it('reads own pre-request and post-response variables', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http' },
        http: { method: 'get', url: '/x' },
        runtime: {
          variables: [{ name: 'attempt', value: '1' }],
          actions: [
            {
              type: 'set-variable',
              phase: 'after-response',
              selector: { expression: 'res.body.token', method: 'jsonq' },
              variable: { name: 'authToken', scope: 'runtime' }
            }
          ]
        }
      } as unknown as HttpRequest);
      expect(data.preVars.map((v) => v.name)).toContain('attempt');
      expect(data.postVars.map((v) => v.name)).toContain('authToken');
    });

    it('surfaces variables inherited from the collection', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { variables: [{ name: 'colVar', value: 'v' }] }
      } as unknown as OpenCollection;
      const data = dataFor(
        { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest,
        collection
      );
      expect(data.inheritedPreVars.map((v) => v.name)).toContain('colVar');
    });
  });

  describe('headers', () => {
    it('reads own headers and reports hasHeaders', () => {
      const data = dataFor({
        info: { name: 'R', type: 'http' },
        http: { method: 'get', url: '/x', headers: [{ name: 'X-Own', value: '1' }] }
      } as HttpRequest);
      expect(data.hasHeaders).toBe(true);
      expect(data.headerTableRows.map((r) => r.label)).toContain('X-Own');
    });

    it('surfaces inherited headers and reports hasInheritedHeaders', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { headers: [{ name: 'X-Collection', value: 'c' }] }
      } as unknown as OpenCollection;
      const data = dataFor(
        { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest,
        collection
      );
      expect(data.hasInheritedHeaders).toBe(true);
      expect(data.inheritedHeaders.map((h) => h.name)).toContain('X-Collection');
    });

    it('merges own and inherited headers into effectiveHeaders', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { headers: [{ name: 'X-Collection', value: 'c' }] }
      } as unknown as OpenCollection;
      const data = dataFor(
        {
          info: { name: 'R', type: 'http' },
          http: { method: 'get', url: '/x', headers: [{ name: 'X-Own', value: '1' }] }
        } as HttpRequest,
        collection
      );
      const names = data.effectiveHeaders.map((h) => h.name);
      expect(names).toContain('X-Own');
      expect(names).toContain('X-Collection');
    });

    it('drops an inherited raw Authorization header from effectiveHeaders when a concrete auth is in effect', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { headers: [{ name: 'Authorization', value: 'Basic legacy' }] }
      } as unknown as OpenCollection;
      const data = dataFor(
        {
          info: { name: 'R', type: 'http' },
          http: { method: 'get', url: '/x', auth: { type: 'bearer', token: 't' } }
        } as unknown as HttpRequest,
        collection
      );
      expect(data.effectiveHeaders.some((h) => h.name.toLowerCase() === 'authorization')).toBe(false);
    });

    it('keeps an inherited Authorization header when no concrete auth is in effect', () => {
      const collection: OpenCollection = {
        info: { name: 'C', version: '1.0.0' },
        request: { headers: [{ name: 'Authorization', value: 'Basic legacy' }] }
      } as unknown as OpenCollection;
      const data = dataFor(
        { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest,
        collection
      );
      expect(data.effectiveHeaders.some((h) => h.name.toLowerCase() === 'authorization')).toBe(true);
    });
  });

  describe('scripts, assertions and tests', () => {
    const item = {
      info: { name: 'R', type: 'http' },
      http: { method: 'get', url: '/x' },
      runtime: {
        assertions: [{ expression: 'res.status', operator: 'eq', value: '200' }],
        scripts: [
          { type: 'before-request', code: 'console.log("pre")' },
          { type: 'tests', code: 'test("returns a token", () => {})' }
        ]
      }
    } as unknown as HttpRequest;
    const collection = {
      info: { name: 'C', version: '1.0.0' },
      request: { scripts: [{ type: 'tests', code: 'test("collection check", () => {})' }] }
    } as unknown as OpenCollection;

    it('collects the assertions', () => {
      const data = dataFor(item, collection);
      expect(data.assertions.length).toBeGreaterThan(0);
    });

    it('builds the script chain and derives the script flow', () => {
      const data = dataFor(item, collection);
      expect(data.scriptChain.length).toBeGreaterThan(0);
      expect(data.scriptFlow).toBeDefined();
    });

    it('collects test cases and raw test scripts', () => {
      const data = dataFor(item, collection);
      expect(data.tests.length).toBeGreaterThan(0);
      expect(Array.isArray(data.testScripts)).toBe(true);
    });

    it('reports hasExecutionContext=true when scripts, vars, assertions or tests are present', () => {
      expect(dataFor(item, collection).hasExecutionContext).toBe(true);
    });

    it('reports hasExecutionContext=false for a bare request', () => {
      const bare = { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest;
      expect(dataFor(bare).hasExecutionContext).toBe(false);
    });
  });

  describe('breadcrumb segments', () => {
    it('builds breadcrumb segments from the ancestry', () => {
      const data = dataFor(
        { info: { name: 'R', type: 'http' }, http: { method: 'get', url: '/x' } } as HttpRequest,
        { info: { name: 'My Collection', version: '1.0.0' } } as OpenCollection,
        [folder('Authentication')]
      );
      const names = data.segments.map((s) => s.name);
      expect(names).toContain('My Collection');
      expect(names).toContain('Authentication');
    });
  });
});
