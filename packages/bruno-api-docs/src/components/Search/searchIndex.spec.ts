import { describe, it, expect } from 'vitest';
import {
  buildSearchRecords,
  collectTopLevelFolders,
  collectMethods,
  createSearchIndex,
  formatBreadcrumb,
  orderFoldersFirst,
  searchHits,
  type SearchRecord,
  type RequestSearchRecord,
  type FolderSearchRecord
} from './searchIndex';
import type { NavEntry } from '../../routing/types';

const requestEntry = (over: Partial<NavEntry> & { uuid: string }): NavEntry => {
  const { uuid, ...rest } = over;
  return {
    slug: 'hotels/get-all',
    type: 'request',
    name: 'Get All Hotels',
    method: 'GET',
    ancestors: [{ name: 'Hotels', slug: 'hotels' }],
    depth: 1,
    item: {
      uuid,
      info: { name: 'Get All Hotels', type: 'http', description: 'List hotels' },
      http: { method: 'GET', url: '{{baseUrl}}/api/v1/hotels', params: [{ name: 'page', value: '1' }] }
    } as never,
    ...rest
  };
};

/** A child item of a folder, as the collection schema shapes it. */
const childItem = (name: string, type: 'http' | 'folder' | 'script', items?: unknown[]) => ({
  uuid: `${type}-${name}`,
  info: { name, type },
  ...(items ? { items } : {})
});

const folderEntry = (over: Partial<NavEntry> & { uuid: string; items?: unknown[] }): NavEntry => {
  const { uuid, items, ...rest } = over;
  return {
    slug: 'hotels',
    type: 'folder',
    name: 'Hotels',
    ancestors: [],
    depth: 0,
    item: { uuid, info: { name: 'Hotels', type: 'folder' }, items: items ?? [] } as never,
    ...rest
  };
};

const requestRecords = (entries: NavEntry[]): RequestSearchRecord[] =>
  buildSearchRecords(entries).filter((r): r is RequestSearchRecord => r.type === 'request');

const folderRecords = (entries: NavEntry[]): FolderSearchRecord[] =>
  buildSearchRecords(entries).filter((r): r is FolderSearchRecord => r.type === 'folder');

describe('buildSearchRecords', () => {
  it('emits one record per request, keyed by item uuid', () => {
    const recs = requestRecords([requestEntry({ uuid: 'u1' })]);
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe('u1');
    expect(recs[0].slug).toBe('hotels/get-all');
    expect(recs[0].method).toBe('GET');
    expect(recs[0].ancestorNames).toEqual(['Hotels']);
    expect(recs[0].url).toContain('/api/v1/hotels');
  });

  it('does not carry params or description onto the record (out of search scope)', () => {
    const recs = requestRecords([requestEntry({ uuid: 'u1' })]);
    expect(recs[0]).not.toHaveProperty('params');
    expect(recs[0]).not.toHaveProperty('description');
  });

  it('carries the ancestor chain as names and slugs', () => {
    const entry = requestEntry({
      uuid: 'u1',
      ancestors: [
        { name: 'Billing', slug: 'billing' },
        { name: 'Lookups', slug: 'billing/lookups' }
      ]
    });
    expect(requestRecords([entry])[0].ancestorNames).toEqual(['Billing', 'Lookups']);
    expect(requestRecords([entry])[0].ancestorSlugs).toEqual(['billing', 'billing/lookups']);
  });

  it('emits a folder record for a folder at any depth', () => {
    const top = folderEntry({ uuid: 'f1' });
    const nested = folderEntry({
      uuid: 'f2',
      slug: 'hotels/rooms',
      name: 'Rooms',
      ancestors: [{ name: 'Hotels', slug: 'hotels' }],
      depth: 1
    });
    const recs = folderRecords([top, nested]);
    expect(recs.map((r) => r.id)).toEqual(['f1', 'f2']);
    expect(recs[1].slug).toBe('hotels/rooms');
    expect(recs[1].ancestorSlugs).toEqual(['hotels']);
  });

  it('gives a folder its own breadcrumb, so same-named folders stay distinguishable', () => {
    const billingAuth = folderEntry({
      uuid: 'f1',
      slug: 'billing/customers/auth',
      name: 'Auth',
      ancestors: [
        { name: 'Billing', slug: 'billing' },
        { name: 'Customers', slug: 'billing/customers' }
      ],
      depth: 2
    });
    const productsAuth = folderEntry({
      uuid: 'f2',
      slug: 'products/users/auth',
      name: 'Auth',
      ancestors: [
        { name: 'Products', slug: 'products' },
        { name: 'Users', slug: 'products/users' }
      ],
      depth: 2
    });
    expect(folderRecords([billingAuth, productsAuth]).map((r) => r.ancestorNames)).toEqual([
      ['Billing', 'Customers'],
      ['Products', 'Users']
    ]);
  });

  it('counts a folder’s requests at every depth', () => {
    const entry = folderEntry({
      uuid: 'f1',
      items: [
        childItem('List', 'http'),
        childItem('Create', 'http'),
        childItem('Nested', 'folder', [childItem('Deep', 'http'), childItem('Deeper', 'folder', [childItem('Deepest', 'http')])])
      ]
    });
    expect(folderRecords([entry])[0].requestCount).toBe(4);
  });

  it('does not count script files as requests', () => {
    const entry = folderEntry({
      uuid: 'f1',
      items: [childItem('List', 'http'), childItem('setup', 'script')]
    });
    expect(folderRecords([entry])[0].requestCount).toBe(1);
  });

  it('excludes built-in pages from records', () => {
    const overview: NavEntry = {
      slug: '', type: 'overview', name: 'Overview', item: null, ancestors: [], depth: -1
    };
    const environments: NavEntry = {
      slug: '~environments', type: 'environments', name: 'Environments', item: null, ancestors: [], depth: -1
    };
    expect(buildSearchRecords([overview, environments])).toHaveLength(0);
  });

  it('skips request items without a hydrated uuid (cannot key the sidebar)', () => {
    const entry = requestEntry({ uuid: '' });
    (entry.item as { uuid?: string }).uuid = undefined;
    expect(buildSearchRecords([entry])).toHaveLength(0);
  });
});

describe('formatBreadcrumb', () => {
  it('paints a chain of three or fewer folders whole', () => {
    expect(formatBreadcrumb([])).toEqual({ full: '', display: '' });
    expect(formatBreadcrumb(['Hotels'])).toEqual({ full: 'Hotels', display: 'Hotels' });
    expect(formatBreadcrumb(['Hotels', 'Auth', 'Auth 2'])).toEqual({
      full: 'Hotels / Auth / Auth 2',
      display: 'Hotels / Auth / Auth 2'
    });
  });

  it('collapses the middle of a deeper chain, keeping the first and last folder', () => {
    expect(formatBreadcrumb(['Hotels', 'Auth', 'Auth 2', 'Legacy'])).toEqual({
      full: 'Hotels / Auth / Auth 2 / Legacy',
      display: 'Hotels / … / Legacy'
    });
  });

  it('counts folders, not separators, so a name holding " / " cannot mis-segment', () => {
    // Three folders, the middle one carrying a separator inside its own name.
    expect(formatBreadcrumb(['Billing', 'A / B', 'Payments'])).toEqual({
      full: 'Billing / A / B / Payments',
      display: 'Billing / A / B / Payments'
    });
    // Four folders elide from the ends, however many separators the names hold.
    expect(formatBreadcrumb(['Billing', 'A / B', 'Payments', 'v3'])).toEqual({
      full: 'Billing / A / B / Payments / v3',
      display: 'Billing / … / v3'
    });
  });
});

describe('collectTopLevelFolders', () => {
  it('returns only depth-0 folders', () => {
    const top: NavEntry = { slug: 'hotels', type: 'folder', name: 'Hotels', item: {} as never, ancestors: [], depth: 0 };
    const nested: NavEntry = { slug: 'hotels/x', type: 'folder', name: 'X', item: {} as never, ancestors: [], depth: 1 };
    expect(collectTopLevelFolders([top, nested, requestEntry({ uuid: 'u1' })])).toEqual([
      { slug: 'hotels', name: 'Hotels' }
    ]);
  });
});

describe('collectMethods', () => {
  it('dedupes and uppercases present methods in canonical order, custom last', () => {
    const folder: NavEntry = { slug: 'f', type: 'folder', name: 'F', item: {} as never, ancestors: [], depth: 0 };
    const entries = [
      requestEntry({ uuid: 'a', method: 'get' }),
      requestEntry({ uuid: 'b', method: 'PATCH' }),
      requestEntry({ uuid: 'c', method: 'GET' }),
      requestEntry({ uuid: 'd', method: 'PURGE' }),
      requestEntry({ uuid: 'e', method: 'HEAD' }),
      folder
    ];
    expect(collectMethods(entries)).toEqual(['GET', 'PATCH', 'HEAD', 'PURGE']);
  });
});

const rec = (over: Partial<RequestSearchRecord>): RequestSearchRecord => ({
  type: 'request', id: 'id', slug: 's', name: '', method: 'GET', ancestorNames: [], ancestorSlugs: [], url: '', ...over
});

const folderRec = (over: Partial<FolderSearchRecord>): FolderSearchRecord => ({
  type: 'folder', id: 'fid', slug: 'f', name: '', ancestorNames: [], ancestorSlugs: [], requestCount: 0, ...over
});

/** Substrings the reported ranges actually cover, for match-locality assertions. */
const matchedText = (text: string, ranges?: Array<[number, number]>): string[] =>
  (ranges ?? []).map(([start, end]) => text.slice(start, end + 1));

const ids = (hits: ReturnType<typeof searchHits>): string[] => hits.map((h) => h.record.id);

// A small, representative billing collection reused across the matching tests.
const BILLING: RequestSearchRecord[] = [
  rec({ id: 'payments', name: 'Get All Payments', ancestorNames: ['Billing'], url: '{{baseUrl}}/billing/payments' }),
  rec({ id: 'invoices', name: 'Get All Invoices', ancestorNames: ['Billing'], url: '{{baseUrl}}/billing/invoices' }),
  rec({ id: 'customers', name: 'Get All Customers', ancestorNames: ['Billing'], url: '{{baseUrl}}/billing/customers' }),
  rec({ id: 'subs', name: 'Get All Subscriptions', ancestorNames: ['Billing'], url: '{{baseUrl}}/billing/subscriptions' }),
  rec({ id: 'currencies', name: 'Get Currencies', ancestorNames: ['Billing', 'Lookups'], url: '{{baseUrl}}/billing/lookups/currencies' })
];

describe('searchHits - empty & degenerate queries', () => {
  it('empty / whitespace query returns no results (initial empty state)', () => {
    const fuse = createSearchIndex([rec({ name: 'anything' })]);
    expect(searchHits(fuse, '')).toEqual([]);
    expect(searchHits(fuse, '   ')).toEqual([]);
  });

  it('a single character does not match (minMatchCharLength = 2)', () => {
    const fuse = createSearchIndex(BILLING);
    expect(searchHits(fuse, 'p')).toEqual([]);
  });

  it('gibberish returns nothing (no false positives)', () => {
    const fuse = createSearchIndex(BILLING);
    expect(searchHits(fuse, 'zzzzz')).toEqual([]);
    expect(searchHits(fuse, 'qwxyz')).toEqual([]);
  });
});

describe('searchHits - exact matches per field', () => {
  it('matches on the name', () => {
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'invoices'))).toContain('invoices');
  });

  it('matches on the url', () => {
    const fuse = createSearchIndex([rec({ id: 'x', name: 'Unrelated', url: '{{baseUrl}}/api/v1/hotels' })]);
    expect(ids(searchHits(fuse, 'hotels'))).toContain('x');
  });

  it('matches a folder on its name', () => {
    const fuse = createSearchIndex([folderRec({ id: 'lookups', name: 'Lookups' })]);
    expect(ids(searchHits(fuse, 'lookups'))).toContain('lookups');
  });

  it('does not match on the breadcrumb: the folder chain is shown, not searched', () => {
    const fuse = createSearchIndex([rec({ id: 'x', name: 'Get item', ancestorNames: ['Billing', 'Lookups'] })]);
    expect(searchHits(fuse, 'lookups')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'PAYMENTS'))).toContain('payments');
    expect(ids(searchHits(fuse, 'PaYmEnTs'))).toContain('payments');
  });
});

describe('searchHits - typo tolerance', () => {
  it('tolerates a one-character error', () => {
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'paymnt'))).toContain('payments'); // dropped letter
    expect(ids(searchHits(fuse, 'invoises'))).toContain('invoices'); // substitution
    expect(ids(searchHits(fuse, 'custmers'))).toContain('customers');
  });

  it('tolerates a transposition / two-character error', () => {
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'paymnet'))).toContain('payments');
    expect(ids(searchHits(fuse, 'subscripton'))).toContain('subs');
  });

  it('the intended record ranks first for a typo', () => {
    const fuse = createSearchIndex(BILLING);
    expect(searchHits(fuse, 'invoises')[0].record.id).toBe('invoices');
  });
});

describe('searchHits - precision (threshold 0.3)', () => {
  it('does not bleed a shared prefix into an unrelated word (cursor !-> currencies)', () => {
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'cursor'))).not.toContain('currencies');
  });
});

describe('searchHits - match locality (no cross-word stitching)', () => {
  it('highlights the real word, not a stray leading char from another token', () => {
    const fuse = createSearchIndex(BILLING);
    const hit = searchHits(fuse, 'billing').find((h) => h.record.id === 'payments')!;
    const { url } = BILLING.find((r) => r.id === 'payments')!;
    const subs = matchedText(url, hit.matches.url);
    // The matched span is the word "billing" itself...
    expect(subs).toContain('billing');
    // ...never the "b" of "{{baseUrl}}" at index 2.
    expect(hit.matches.url?.map(([start]) => start)).not.toContain(2);
  });
});

describe('searchHits - ranking & weights', () => {
  it('ranks every folder above every request', () => {
    const request = rec({ id: 'request', name: 'Booking' });
    const folder = folderRec({ id: 'folder', name: 'Bookings' });
    const fuse = createSearchIndex([request, folder]);
    expect(ids(searchHits(fuse, 'booking'))).toEqual(['folder', 'request']);
  });

  it('groups folders first even when a request scores better', () => {
    const exact = rec({ id: 'request', name: 'Auth' });
    const fuzzy = folderRec({ id: 'folder', name: 'Author Notes' });
    const fuse = createSearchIndex([exact, fuzzy]);
    expect(searchHits(fuse, 'auth')[0].record.id).toBe('folder');
  });

  it('ranks an exact match above a typo match', () => {
    const exact = rec({ id: 'exact', name: 'payments' });
    const typo = rec({ id: 'typo', name: 'paymznts' });
    const fuse = createSearchIndex([typo, exact]);
    expect(searchHits(fuse, 'payments')[0].record.id).toBe('exact');
  });

  it('drops non-matching records from the result set', () => {
    const fuse = createSearchIndex([rec({ id: 'a', name: 'Get All Hotels' }), rec({ id: 'b', name: 'Booking list' })]);
    expect(ids(searchHits(fuse, 'hotel'))).toEqual(['a']);
  });
});

describe('orderFoldersFirst', () => {
  const hit = (record: SearchRecord) => ({ record, matches: {} });

  it('lifts folders above requests without reordering within a group', () => {
    const ordered = orderFoldersFirst([
      hit(rec({ id: 'r1' })),
      hit(folderRec({ id: 'f1' })),
      hit(rec({ id: 'r2' })),
      hit(folderRec({ id: 'f2' }))
    ]);
    expect(ordered.map((h) => h.record.id)).toEqual(['f1', 'f2', 'r1', 'r2']);
  });
});

describe('searchHits - reported matches for highlighting', () => {
  it('reports ranges only for the fields that actually matched', () => {
    const fuse = createSearchIndex([rec({ id: 'x', name: 'Get All Payments', url: '{{baseUrl}}/billing/invoices' })]);
    const hit = searchHits(fuse, 'payments')[0];
    // "payments" is in the name but not in the url.
    expect(hit.matches.name).toBeTruthy();
    expect(hit.matches.url).toBeUndefined();
  });

  it('reports only a name range for a folder (it has no url to match)', () => {
    const fuse = createSearchIndex([folderRec({ id: 'f', name: 'Payments' })]);
    const hit = searchHits(fuse, 'payments')[0];
    expect(hit.matches.name).toBeTruthy();
    expect(hit.matches.url).toBeUndefined();
  });

  it('reported ranges slice back to the query word', () => {
    const fuse = createSearchIndex([rec({ id: 'x', name: 'Get All Payments' })]);
    const hit = searchHits(fuse, 'payments')[0];
    expect(matchedText(hit.record.name, hit.matches.name)).toContain('Payments');
  });
});

describe('searchHits - transposition typos (adjacent letter swap)', () => {
  it('matches a single adjacent swap on a short word the raw threshold misses', () => {
    const fuse = createSearchIndex([rec({ id: 'hotels', name: 'Get All Hotels', url: '{{baseUrl}}/hotels' })]);
    expect(ids(searchHits(fuse, 'hotles'))).toContain('hotels'); // hotels -> l/e swapped
    expect(ids(searchHits(fuse, 'htoels'))).toContain('hotels'); // hotels -> o/t swapped
  });

  it('improves the rank of a typo that contains a transposition', () => {
    const fuse = createSearchIndex(BILLING);
    expect(searchHits(fuse, 'paymnet')[0].record.id).toBe('payments');
  });

  it('swap variants do not introduce unrelated records (near-exact gate)', () => {
    const fuse = createSearchIndex(BILLING);
    // Scrambling "cursor" must not back-door "currencies" in via a variant.
    expect(ids(searchHits(fuse, 'cursor'))).not.toContain('currencies');
    expect(searchHits(fuse, 'zzzzz')).toEqual([]);
  });
});

describe('searchHits - abbreviations are intentionally out of scope', () => {
  // Bitap only matches contiguous approximate spans, never a gapped subsequence
  // like a consonant-skeleton abbreviation. Supporting those would need a much
  // looser threshold that reopens the prefix-bleed false positives above, so it
  // is deliberately left unsupported. These guard that boundary: if the matcher
  // ever starts accepting abbreviations, precision has almost certainly slipped.
  it('does not match a consonant-skeleton abbreviation', () => {
    const hotels = createSearchIndex([rec({ id: 'h', name: 'Get All Hotels', url: '{{baseUrl}}/api/v1/hotels' })]);
    expect(ids(searchHits(hotels, 'htl'))).not.toContain('h'); // htl -> hotel
    const fuse = createSearchIndex(BILLING);
    expect(ids(searchHits(fuse, 'pmts'))).not.toContain('payments'); // pmts -> payments
  });
});
