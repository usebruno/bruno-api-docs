import { useMemo, useState } from 'react';
import type { OpenCollection } from '@opencollection/types';
import { useNavModel } from '@/routing/hooks';
import { buildSearchRecords, createSearchIndex, searchHits } from '@/components/Search/searchIndex';
import { filterItems, findItemByUuid, getItemUuid } from '@/utils/itemUtils';

const MIN_QUERY_LENGTH = 2;

export const usePlaygroundSearch = (
  collection: OpenCollection | null,
  onToggleFolder: (uuid: string) => void,
  onExpandFolder: (uuid: string) => void
) => {
  const [query, setQuery] = useState('');
  const [closedWhileSearching, setClosedWhileSearching] = useState<Set<string>>(new Set());

  const isSearching = query.trim().length >= MIN_QUERY_LENGTH;

  const model = useNavModel();
  const searchIndex = useMemo(() => {
    if (!isSearching) return null;
    const entries = model.ordered.map((entry) => {
      const uuid = entry.item ? getItemUuid(entry.item) : undefined;
      const item = uuid ? findItemByUuid(collection?.items, uuid) : null;
      return item ? { ...entry, item } : entry;
    });
    return createSearchIndex(buildSearchRecords(entries));
  }, [isSearching, model, collection]);

  const hits = useMemo(() => (searchIndex ? searchHits(searchIndex, query) : []), [searchIndex, query]);

  const items = useMemo(() => {
    const allItems = collection?.items ?? [];
    if (!isSearching) return allItems;
    const matchedIds = new Set(hits.map((hit) => hit.record.id));
    return filterItems(allItems, matchedIds, closedWhileSearching);
  }, [collection, hits, isSearching, closedWhileSearching]);

  const nameMatches = useMemo(
    () => new Map(hits.map((hit) => [hit.record.id, hit.matches.name ?? []])),
    [hits]
  );

  const urlMatches = useMemo(() => {
    const map = new Map<string, { url: string; ranges: Array<[number, number]> }>();
    for (const { record, matches } of hits) {
      if (record.type === 'request' && matches.url) map.set(record.id, { url: record.url, ranges: matches.url });
    }
    return map;
  }, [hits]);

  const onSearchChange = (value: string) => {
    setQuery(value);
    setClosedWhileSearching(new Set());
  };

  const toggleFolder = (uuid: string) => {
    if (!isSearching) return onToggleFolder(uuid);
    setClosedWhileSearching((previous) => {
      const next = new Set(previous);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const expandFolder = (uuid: string) => {
    if (!isSearching) return onExpandFolder(uuid);
    setClosedWhileSearching((previous) => {
      const next = new Set(previous);
      next.delete(uuid);
      return next;
    });
  };

  return { query, onSearchChange, isSearching, items, nameMatches, urlMatches, toggleFolder, expandFolder };
};
