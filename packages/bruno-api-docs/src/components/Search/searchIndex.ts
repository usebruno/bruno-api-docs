/**
 * Search index for the collection palette.
 *
 * Turns the routing NavModel's ordered entries into flat, scoreable records:
 * one per request node and one per folder node, at any depth. Each record's
 * `id` is the item UUID, the exact identifier the sidebar keys on.
 *
 * Requests match on name and url; folders match on name alone, since a folder
 * is not an endpoint and has no url to match or display.
 *
 * Pure + React-free so it can be unit tested and memoized by the caller.
 */

import Fuse from 'fuse.js';
import type { IFuseOptions, FuseResultMatch } from 'fuse.js';
import type { Folder } from '@opencollection/types/collection/item';
import type { NavEntry } from '../../routing/types';
import { getRequestUrl } from '../../utils/schemaHelpers';
import { getItemUuid } from '../../utils/itemUtils';
import { countFolderRequests } from '../../utils/folder';

interface SearchRecordBase {
  /** Item UUID (the sidebar key). */
  id: string;
  /** Route target slug. */
  slug: string;
  name: string;
  /** Ancestor folder names, outermost first; joined for display, never searched. */
  ancestorNames: string[];
  /** Ancestor folder slugs, for the folder filter chip. */
  ancestorSlugs: string[];
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

/** A folder offered in the palette's folder filter dropdown. */
export interface FolderOption {
  slug: string;
  name: string;
}

const BREADCRUMB_SEPARATOR = ' / ';

/** Build the searchable records (requests + folders) from the nav model. */
export const buildSearchRecords = (entries: NavEntry[]): SearchRecord[] => {
  const records: SearchRecord[] = [];
  for (const entry of entries) {
    if (!entry.item) continue;
    const id = getItemUuid(entry.item);
    if (!id) continue; // unhydrated, cannot key to the sidebar; skip
    const common = {
      id,
      slug: entry.slug,
      name: entry.name,
      ancestorNames: entry.ancestors.map((a) => a.name),
      ancestorSlugs: entry.ancestors.map((a) => a.slug)
    };

    if (entry.type === 'folder') {
      records.push({
        type: 'folder',
        ...common,
        requestCount: countFolderRequests(entry.item as Folder)
      });
    } else if (entry.type === 'request') {
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
  /** Every ancestor, for the accessible name and the tooltip. */
  full: string;
  /** What the row paints; equals `full` until the chain is too long. */
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

/** Top-level folders, for the folder filter dropdown. */
export const collectTopLevelFolders = (entries: NavEntry[]): FolderOption[] =>
  entries
    .filter((e) => e.type === 'folder' && e.depth === 0)
    .map((e) => ({ slug: e.slug, name: e.name }));

/** Canonical display order for method filters; anything not listed sorts last. */
const METHOD_DISPLAY_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

/**
 * Distinct request methods present in the collection, uppercased, in canonical
 * order (custom methods last, alphabetical). Drives the method filters so any
 * method actually in use (PATCH/HEAD/OPTIONS/custom) is offered, not a fixed list.
 */
export const collectMethods = (entries: NavEntry[]): string[] => {
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.type !== 'request') continue;
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

/** Searchable + highlightable fields, in weight order (name dominates). */
type SearchField = 'name' | 'url';

/** Matched character ranges per field, as inclusive [start, end] pairs. */
export type FieldMatches = Partial<Record<SearchField, Array<[number, number]>>>;

/** A ranked result plus the ranges that matched, so the row can bold them. */
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
 * Adjacent-character swaps of `query`, e.g. "hotles" → ["ohtles", "htoles",
 * "holtes", "hotels", "hotlse"]. Bitap scores a transposition as two edits, so
 * a swap-typo on a short word ("hotles" → "hotels") busts the threshold and is
 * missed. Searching these variants restores the correction as a near-exact hit
 * without loosening the threshold (which would reopen prefix-bleed matches).
 * Swaps of equal neighbours are skipped (they reproduce the original). Long
 * queries are not expanded: they are far more likely a pasted string than a
 * mistyped word, and expansion is one Fuse pass per character position.
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

/**
 * A swap variant must come back near-exact to count: a genuine de-typo lands at
 * ~0 (the corrected word is really there), whereas a variant that only fuzzily
 * grazes an unrelated record scores higher and is noise. This gate only applies
 * to records the original query did NOT already surface.
 */
const TRANSPOSITION_MAX_SCORE = 0.1;

/**
 * Folders form a block above requests, matching how the sidebar orders a level.
 * The grouping is unconditional, so a fuzzy folder hit outranks an exact request
 * hit; score only decides the order within a block.
 */
const groupRank = (record: SearchRecord): number => (record.type === 'folder' ? 0 : 1);

/**
 * Apply that same grouping to an already-ordered list, for the filter-only
 * results the palette builds without running a query. The sort is stable, so
 * each group keeps its incoming (nav) order.
 */
export const orderFoldersFirst = (hits: SearchHit[]): SearchHit[] =>
  [...hits].sort((a, b) => groupRank(a.record) - groupRank(b.record));

/**
 * Rank records against a query (text only; filters are applied separately by
 * the caller). Empty query → [] (the palette shows its initial empty state,
 * not the whole collection). The original query runs at the normal threshold;
 * adjacent-swap variants back-fill transposition typos the threshold misses.
 * Each record is kept at its best (lowest) score, so a variant that corrects a
 * typo also improves the row's rank and highlight.
 */
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
