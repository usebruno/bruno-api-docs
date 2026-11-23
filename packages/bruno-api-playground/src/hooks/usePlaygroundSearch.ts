import { useMemo, useState } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';
import { useNavModel } from '@usebruno/api-shared/document/document';
import { filterItems, getItemUuid } from '@usebruno/api-shared/utils/itemUtils';

const SEARCHABLE = new Set(['folder', 'request', 'graphql']);

export const usePlaygroundSearch = (
  collection: OpenCollection | null,
  onToggleFolder: (uuid: string) => void,
  onExpandFolder: (uuid: string) => void,
  isFolderCollapsed: (folder: OpenCollectionItem) => boolean
) => {
  const [query, setQuery] = useState('');
  const [closedWhileSearching, setClosedWhileSearching] = useState<Set<string>>(new Set());

  const isSearching = query.trim().length > 0;

  const model = useNavModel();
  const nameMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = new Map<string, Array<[number, number]>>();
    if (!needle) return matches;
    for (const entry of model.ordered) {
      const uuid = getItemUuid(entry.item);
      if (!uuid || !SEARCHABLE.has(entry.type)) continue;
      const start = entry.name.toLowerCase().indexOf(needle);
      if (start !== -1) matches.set(uuid, [[start, start + needle.length - 1]]);
    }
    return matches;
  }, [model, query]);
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

  const isFolderCollapsedNow = (folder: OpenCollectionItem) => {
    if (!isSearching) return isFolderCollapsed(folder);
    const uuid = getItemUuid(folder);
    return uuid !== undefined && closedWhileSearching.has(uuid);
  };

  return {
    query,
    onSearchChange,
    isSearching,
    items,
    nameMatches,
    toggleFolder,
    expandFolder,
    isFolderCollapsed: isFolderCollapsedNow
  };
};
