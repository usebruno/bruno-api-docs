import { useCallback, useMemo, useState } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import { findItemByUuid, getItemUuid } from '@/utils/itemUtils';

export interface FolderCollapse {
  isCollapsed: (folder: Item) => boolean;
  toggle: (uuid: string) => void;
  expand: (uuids: string[]) => void;
}

const collapsedByDefault = (folder: Item | null): boolean =>
  (folder as { isCollapsed?: boolean } | null)?.isCollapsed ?? true;

export const useFolderCollapse = (document: OpenCollection | null): FolderCollapse => {
  const [state, setState] = useState({ document, collapsed: new Map<string, boolean>() });
  const collapsed = state.document === document ? state.collapsed : null;

  const update = useCallback(
    (apply: (collapsed: Map<string, boolean>) => boolean | void) =>
      setState((prev) => {
        const next = new Map(prev.document === document ? prev.collapsed : undefined);
        if (apply(next) === false && prev.document === document) return prev;
        return { document, collapsed: next };
      }),
    [document]
  );

  const toggle = useCallback(
    (uuid: string) =>
      update((next) => {
        next.set(uuid, !(next.get(uuid) ?? collapsedByDefault(findItemByUuid(document?.items, uuid))));
      }),
    [update, document]
  );

  const expand = useCallback(
    (uuids: string[]) =>
      update((next) => {
        const open = (uuid: string) => !(next.get(uuid) ?? collapsedByDefault(findItemByUuid(document?.items, uuid)));
        if (uuids.every(open)) return false;
        uuids.forEach((uuid) => next.set(uuid, false));
      }),
    [update, document]
  );

  return useMemo(
    () => ({
      isCollapsed: (folder: Item) => {
        const uuid = getItemUuid(folder);
        return uuid !== undefined && collapsed?.has(uuid) ? collapsed.get(uuid)! : collapsedByDefault(folder);
      },
      toggle,
      expand
    }),
    [collapsed, toggle, expand]
  );
};
