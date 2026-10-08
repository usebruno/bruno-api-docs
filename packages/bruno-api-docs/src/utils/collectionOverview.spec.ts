import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import {
  countItems,
  getCollectionStats,
  hasCollectionExecutionContext,
  hasCollectionRequestConfig,
  type CollectionScripts
} from './collectionOverview';

const hasCollectionConfiguration = (
  headers: HttpRequestHeader[] = [],
  auth?: Auth,
  scripts: CollectionScripts = {},
  hasVars = false
): boolean =>
  hasCollectionRequestConfig(headers, auth) || hasCollectionExecutionContext(scripts, hasVars);

describe('countItems', () => {
  it('counts requests and folders recursively at every depth', () => {
    const items = [
      {
        type: 'folder',
        name: 'Auth',
        items: [
          { info: { type: 'http' }, http: {} },
          { info: { type: 'http' }, http: {} }
        ]
      },
      {
        type: 'folder',
        name: 'Hotels',
        items: [{ type: 'folder', name: 'Nested', items: [{ info: { type: 'http' }, http: {} }] }]
      },
      { info: { type: 'http' }, http: {} }
    ] as unknown as OpenCollectionItem[];

    expect(countItems(items)).toEqual({ requestCount: 4, folderCount: 3 });
  });

  it('returns zero counts for empty/missing items', () => {
    expect(countItems(undefined)).toEqual({ requestCount: 0, folderCount: 0 });
    expect(countItems([])).toEqual({ requestCount: 0, folderCount: 0 });
  });
});

describe('getCollectionStats', () => {
  it('includes the environment count from config', () => {
    const collection = {
      items: [{ info: { type: 'http' }, http: {} }],
      config: { environments: [{ name: 'Dev' }, { name: 'Prod' }] }
    } as unknown as OpenCollection;

    expect(getCollectionStats(collection)).toEqual({
      requestCount: 1,
      folderCount: 0,
      environmentCount: 2
    });
  });

  it('handles a null collection', () => {
    expect(getCollectionStats(null)).toEqual({ requestCount: 0, folderCount: 0, environmentCount: 0 });
  });
});

describe('hasCollectionConfiguration', () => {
  it('is false for an empty collection', () => {
    expect(hasCollectionConfiguration()).toBe(false);
    expect(hasCollectionConfiguration([], undefined, {})).toBe(false);
  });

  it('ignores nameless headers but counts disabled (still named) ones', () => {
    expect(hasCollectionConfiguration([{ name: '', value: 'x' }])).toBe(false);
    expect(hasCollectionConfiguration([{ name: 'Accept', value: 'json', disabled: true }])).toBe(true);
  });

  it('is true when an enabled, named header is present', () => {
    expect(hasCollectionConfiguration([{ name: 'Accept', value: 'application/json' }])).toBe(true);
  });

  it('is true when auth is configured', () => {
    expect(hasCollectionConfiguration([], { type: 'bearer', token: 't' })).toBe(true);
  });

  it('is true when any script is present', () => {
    expect(hasCollectionConfiguration([], undefined, { preRequest: 'x' })).toBe(true);
    expect(hasCollectionConfiguration([], undefined, { postResponse: 'y' })).toBe(true);
    expect(hasCollectionConfiguration([], undefined, { tests: 'z' })).toBe(true);
  });
});

describe('hasCollectionRequestConfig', () => {
  it('is true for a named header', () => {
    expect(hasCollectionRequestConfig([{ name: 'Accept', value: 'json' }])).toBe(true);
  });

  it('is true for configured auth', () => {
    expect(hasCollectionRequestConfig([], { type: 'bearer', token: 't' })).toBe(true);
  });

  it('is false for no headers and no auth', () => {
    expect(hasCollectionRequestConfig([], undefined)).toBe(false);
    expect(hasCollectionRequestConfig([{ name: '', value: 'x' }], { type: 'none' })).toBe(false);
  });
});

describe('hasCollectionExecutionContext', () => {
  it('is true for variables', () => {
    expect(hasCollectionExecutionContext({}, true)).toBe(true);
  });

  it('is true for any script', () => {
    expect(hasCollectionExecutionContext({ preRequest: 'x' }, false)).toBe(true);
    expect(hasCollectionExecutionContext({ postResponse: 'y' }, false)).toBe(true);
    expect(hasCollectionExecutionContext({ tests: 'z' }, false)).toBe(true);
  });

  it('is false with neither variables nor scripts', () => {
    expect(hasCollectionExecutionContext({}, false)).toBe(false);
  });
});
