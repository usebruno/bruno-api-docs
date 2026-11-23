import { useMemo, useState } from 'react';
import type { OpenCollection } from '@opencollection/types';
import { useNavModel } from '@/routing/hooks';
import { buildSearchRecords } from '@/components/Search/searchIndex';
import { filterItems } from '@/utils/itemUtils';

export const usePlaygroundSearch = (
  collection: OpenCollection | null,
  onToggleFolder: (uuid: string) => void,
  onExpandFolder: (uuid: string) => void
) => {
  const [query, setQuery] = useState('');
  const [closedWhileSearching, setClosedWhileSearching] = useState<Set<string>>(new Set());

  const isSearching = query.trim().length > 0;

  const model = useNavModel();
  const records = useMemo(() => (isSearching ? buildSearchRecords(model.ordered) : []), [isSearching, model]);
  const nameMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = new Map<string, Array<[number, number]>>();
    for (const record of records) {
      const start = record.name.toLowerCase().indexOf(needle);
      if (start !== -1) matches.set(record.id, [[start, start + needle.length - 1]]);
    }
    return matches;
  }, [records, query]);
  const items = useMemo(() => {
    const allItems = collection?.items ?? [];
    if (!isSearching) return allItems;
    return filterItems(allItems, new Set(nameMatches.keys()), closedWhileSearching);
  }, [collection, nameMatches, isSearching, closedWhileSearching]);

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

  return { query, onSearchChange, isSearching, items, nameMatches, toggleFolder, expandFolder };
};
