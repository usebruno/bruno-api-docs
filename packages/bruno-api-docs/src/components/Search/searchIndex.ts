import Fuse from 'fuse.js';
import type { IFuseOptions, FuseResultMatch } from 'fuse.js';
import type { Folder } from '@opencollection/types/collection/item';
import type { NavEntry } from '@usebruno/api-shared/routing/types';
import { getRequestUrl, getItemTags } from '@usebruno/api-shared/utils/schemaHelpers';
import { getItemUuid } from '@usebruno/api-shared/utils/itemUtils';
import { countFolderRequests } from '@/utils/folder';

interface SearchRecordBase {
  id: string;
  slug: string;
  name: string;
  ancestorNames: string[];
  tags: string[];
}

export interface RequestSearchRecord extends SearchRecordBase {
  type: 'request';
  method?: string;
  url: string;
}

export interface FolderSearchRecord extends SearchRecordBase {
  type: 'folder';
  requestCount: number;
}

export type SearchRecord = RequestSearchRecord | FolderSearchRecord;

const BREADCRUMB_SEPARATOR = ' / ';

// GraphQL requests route to their own page type but are requests for search.
const isRequestEntry = (entry: NavEntry): boolean => entry.type === 'request' || entry.type === 'graphql';

/** Build the searchable records (requests + folders) from the nav model. */
export const buildSearchRecords = (entries: NavEntry[]): SearchRecord[] => {
  const folderTagsBySlug = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.type !== 'folder' || !entry.item) continue;
    const folderTags = getItemTags(entry.item);
    if (folderTags.length > 0) folderTagsBySlug.set(entry.slug, folderTags);
  }

  const records: SearchRecord[] = [];
  for (const entry of entries) {
    if (!entry.item) continue;
    const id = getItemUuid(entry.item);
    if (!id) continue;
    const tags = new Set(getItemTags(entry.item));
    for (const ancestor of entry.ancestors) {
      for (const tag of folderTagsBySlug.get(ancestor.slug) ?? []) tags.add(tag);
    }
    const common = {
      id,
      slug: entry.slug,
      name: entry.name,
      ancestorNames: entry.ancestors.map((a) => a.name),
      tags: [...tags]
    };

    if (entry.type === 'folder') {
      records.push({
        type: 'folder',
        ...common,
        requestCount: countFolderRequests(entry.item as Folder)
      });
    } else if (isRequestEntry(entry)) {
      records.push({
        type: 'request',
        ...common,
        method: entry.method,
        url: getRequestUrl(entry.item as never)
      });
    }
  }
  return records;
};

const MAX_BREADCRUMB_SEGMENTS = 3;

export interface BreadcrumbText {
  full: string;
  display: string;
}

/**
 * Render the ancestor chain, collapsing the middle of a long one:
 * ["A","B","C","D"] → "A / … / D". Folder names are free text and may contain
 * the separator themselves, so the chain is only ever joined here — never
 * split back apart.
 */
export const formatBreadcrumb = (ancestorNames: string[]): BreadcrumbText => {
  const full = ancestorNames.join(BREADCRUMB_SEPARATOR);
  if (ancestorNames.length <= MAX_BREADCRUMB_SEGMENTS) return { full, display: full };
  const ends = [ancestorNames[0], '…', ancestorNames[ancestorNames.length - 1]];
  return { full, display: ends.join(BREADCRUMB_SEPARATOR) };
};

export const collectTags = (records: SearchRecord[]): string[] => {
  const seen = new Set<string>();
  for (const record of records) {
    for (const tag of record.tags) seen.add(tag);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
};

const METHOD_DISPLAY_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

export const collectMethods = (entries: NavEntry[]): string[] => {
  const seen = new Set<string>();
  for (const e of entries) {
    if (!isRequestEntry(e)) continue;
    const m = e.method?.toUpperCase();
    if (m) seen.add(m);
  }
  return [...seen].sort((a, b) => {
    const ia = METHOD_DISPLAY_ORDER.indexOf(a);
    const ib = METHOD_DISPLAY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
};

type SearchField = 'name' | 'url';

export type FieldMatches = Partial<Record<SearchField, Array<[number, number]>>>;

export interface SearchHit {
  record: SearchRecord;
  matches: FieldMatches;
}

/**
 * Fuse options tuned for endpoint search. Bitap gives typo tolerance
 * (`bikling` → `billing`) while matching a *contiguous* window, so a query
 * never stitches characters across separate words the way a subsequence would.
 * `ignoreLocation` is required because URLs are long and the match can sit
 * anywhere in them; `threshold` trades typo tolerance against noise.
 *
 * Folder records carry no `url`, so they are matched on name alone.
 */
const FUSE_OPTIONS: IFuseOptions<SearchRecord> = {
  includeMatches: true,
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.3,
  minMatchCharLength: 2,
  keys: [
    { name: 'name', weight: 3 },
    { name: 'url', weight: 2 }
  ]
};

/** Build the Fuse index once per record set (memoize at the call site). */
export const createSearchIndex = (records: SearchRecord[]): Fuse<SearchRecord> =>
  new Fuse(records, FUSE_OPTIONS);

const collectMatches = (matches: readonly FuseResultMatch[] | undefined): FieldMatches => {
  const byField: FieldMatches = {};
  for (const m of matches ?? []) {
    const field = m.key as SearchField | undefined;
    if (!field) continue;
    byField[field] = m.indices.map(([start, end]) => [start, end] as [number, number]);
  }
  return byField;
};
/**
* Keeping a threshold of 24 for queries, a longer string is far more likely a
* pasted string like a URL rather than a mistyped word.
*/
const MAX_SWAP_QUERY_LENGTH = 24;

const adjacentSwaps = (query: string): string[] => {
  if (query.length > MAX_SWAP_QUERY_LENGTH) return [];
  const variants: string[] = [];
  for (let i = 0; i < query.length - 1; i++) {
    if (query[i] === query[i + 1]) continue;
    variants.push(query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2));
  }
  return variants;
};

const TRANSPOSITION_MAX_SCORE = 0.1;

const groupRank = (record: SearchRecord): number => (record.type === 'folder' ? 0 : 1);

export const orderFoldersFirst = (hits: SearchHit[]): SearchHit[] =>
  [...hits].sort((a, b) => groupRank(a.record) - groupRank(b.record));

export const searchHits = (fuse: Fuse<SearchRecord>, query: string): SearchHit[] => {
  const q = query.trim();
  if (!q) return [];

  const bestById = new Map<string, { record: SearchRecord; matches: FieldMatches; score: number }>();
  const ingest = (results: ReturnType<Fuse<SearchRecord>['search']>, isOriginal: boolean) => {
    for (const r of results) {
      const score = r.score ?? 1;
      const seen = bestById.get(r.item.id);
      // A variant may only introduce a new record when it matched near-exactly.
      if (!isOriginal && !seen && score > TRANSPOSITION_MAX_SCORE) continue;
      if (!seen || score < seen.score) {
        bestById.set(r.item.id, { record: r.item, matches: collectMatches(r.matches), score });
      }
    }
  };

  ingest(fuse.search(q), true);
  for (const variant of adjacentSwaps(q)) ingest(fuse.search(variant), false);

  return [...bestById.values()]
    .sort((a, b) => groupRank(a.record) - groupRank(b.record) || a.score - b.score)
    .map(({ record, matches }) => ({ record, matches }));
};
