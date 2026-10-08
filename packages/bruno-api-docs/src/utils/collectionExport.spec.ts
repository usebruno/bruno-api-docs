import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import type { OpenCollection } from '@opencollection/types';
import type { Folder } from '@opencollection/types/collection/item';
import { getItemName } from './schemaHelpers';
import { stripHydration, serializeCollectionYaml, collectionFilename, resolveDownloadYaml } from './collectionExport';

const hydrated = {
  opencollection: '1.0.0',
  info: { name: 'Hotel Booking API' },
  items: [
    {
      info: { name: 'Rooms', type: 'folder' },
      uuid: 'f-1',
      isCollapsed: true,
      items: [
        { info: { name: 'List rooms', type: 'http' }, uuid: 'r-1', http: { method: 'GET', url: '{{host}}/rooms' } }
      ]
    },
    { info: { name: 'Ping', type: 'http' }, uuid: 'r-2', http: { method: 'GET', url: '{{host}}/ping' } }
  ]
} as unknown as OpenCollection;

describe('stripHydration', () => {
  it('removes uuid and isCollapsed at every depth', () => {
    const text = JSON.stringify(stripHydration(hydrated));
    expect(text).not.toContain('uuid');
    expect(text).not.toContain('isCollapsed');
  });

  it('keeps every other field and the item order', () => {
    const result = stripHydration(hydrated);
    expect(result.opencollection).toBe('1.0.0');
    expect(result.info!.name).toBe('Hotel Booking API');
    expect(result.items!.map(getItemName)).toEqual(['Rooms', 'Ping']);
    expect(getItemName((result.items![0] as Folder).items![0])).toBe('List rooms');
  });

  it('does not add an items key to folders or collections that had none', () => {
    const sparse = {
      opencollection: '1.0.0',
      items: [{ info: { name: 'Empty', type: 'folder' }, uuid: 'f-1', isCollapsed: true }]
    } as unknown as OpenCollection;
    const result = stripHydration(sparse);
    expect('items' in result.items![0]).toBe(false);
    expect('items' in stripHydration({ opencollection: '1.0.0' } as unknown as OpenCollection)).toBe(false);
  });

  it('does not mutate the input', () => {
    stripHydration(hydrated);
    expect((hydrated.items![0] as { uuid?: string }).uuid).toBe('f-1');
  });
});

describe('serializeCollectionYaml', () => {
  it('keeps non-ASCII folder, request and environment names intact through the rebuild path', () => {
    const unicode = {
      opencollection: '1.0.0',
      info: { name: '日本語 API' },
      config: { environments: [{ name: 'Ünïcödé Env', variables: [{ name: 'host', value: 'https://例え.jp' }] }] },
      items: [
        {
          info: { name: '🚀 フォルダ', type: 'folder' },
          uuid: 'f-1',
          items: [{ info: { name: 'Запрос ✓', type: 'http' }, uuid: 'r-1', http: { method: 'GET', url: '{{host}}/été' } }]
        }
      ]
    } as unknown as OpenCollection;
    const yaml = serializeCollectionYaml(stripHydration(unicode));
    for (const literal of ['日本語 API', 'Ünïcödé Env', 'https://例え.jp', '🚀 フォルダ', 'Запрос ✓', '/été']) {
      expect(yaml).toContain(literal);
    }
    expect(yaml).not.toMatch(/\\u[0-9a-f]{4}/i);
    const parsed = load(yaml) as OpenCollection;
    expect(getItemName(parsed.items![0])).toBe('🚀 フォルダ');
    expect(getItemName((parsed.items![0] as Folder).items![0])).toBe('Запрос ✓');
  });

  it('produces YAML that parses back with the opencollection marker intact', () => {
    const yaml = serializeCollectionYaml(stripHydration(hydrated));
    const parsed = load(yaml) as { opencollection: string; items: unknown[] };
    expect(parsed.opencollection).toBe('1.0.0');
    expect(parsed.items).toHaveLength(2);
    expect(yaml).not.toContain('uuid');
  });
});

describe('collectionFilename', () => {
  const named = (name: string) => ({ info: { name }, items: [] } as unknown as OpenCollection);

  it('keeps the collection name as the desktop export does and adds .yml', () => {
    expect(collectionFilename(hydrated)).toBe('Hotel Booking API.yml');
  });

  it('keeps non-ASCII names intact', () => {
    expect(collectionFilename(named('日本語'))).toBe('日本語.yml');
    expect(collectionFilename(named('🚀 Launch API'))).toBe('🚀 Launch API.yml');
    expect(collectionFilename(named('Ünïcödé Ápi'))).toBe('Ünïcödé Ápi.yml');
  });

  it('replaces filesystem-illegal characters and trims leading/trailing junk', () => {
    expect(collectionFilename(named('a/b:c*d?e"f<g>h|i'))).toBe('a-b-c-d-e-f-g-h-i.yml');
    expect(collectionFilename(named('  -- Draft API. . '))).toBe('Draft API.yml');
  });

  it('falls back to collection.yml when there is no usable name', () => {
    expect(collectionFilename({ items: [] } as unknown as OpenCollection)).toBe('collection.yml');
    expect(collectionFilename(named('   '))).toBe('collection.yml');
    expect(collectionFilename(named('...'))).toBe('collection.yml');
    expect(collectionFilename(null)).toBe('collection.yml');
  });
});

describe('resolveDownloadYaml', () => {
  it('returns the original YAML text untouched when available', () => {
    const source = 'opencollection: "1.0.0"\ninfo:\n  name: Hotel Booking API # keep me\n';
    expect(resolveDownloadYaml(source, hydrated)).toBe(source);
  });

  it('rebuilds from the collection when the source text is JSON', () => {
    const yaml = resolveDownloadYaml('{"opencollection":"1.0.0","items":[]}', hydrated);
    expect(yaml.startsWith('{')).toBe(false);
    expect((load(yaml) as { info: { name: string } }).info.name).toBe('Hotel Booking API');
    expect(yaml).not.toContain('uuid');
  });

  it('rebuilds from the collection when there is no source text', () => {
    const yaml = resolveDownloadYaml(null, hydrated);
    expect((load(yaml) as { opencollection: string }).opencollection).toBe('1.0.0');
    expect(yaml).not.toContain('uuid');
  });
});
