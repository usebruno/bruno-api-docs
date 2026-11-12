import type { Item } from '@opencollection/types/collection/item';
import { createObservable } from '../observable/observable';
import { findItemByUuid, getItemUuid } from '../utils/itemUtils';
import { isFolder } from '../utils/schemaHelpers';

export interface PlaygroundFolderState {
  items: Item[] | undefined;
  collapsed: Map<string, boolean>;
}

export const isFolderCollapsed = ({ collapsed }: PlaygroundFolderState, folder: Item): boolean => {
  const uuid = getItemUuid(folder);
  return (uuid !== undefined ? collapsed.get(uuid) : undefined)
    ?? (folder as { isCollapsed?: boolean }).isCollapsed
    ?? true;
};

const carryOver = (
  next: Item[],
  previous: Item[],
  wasCollapsed: (folder: Item) => boolean,
  into: Map<string, boolean>
): void => {
  for (const item of next) {
    if (!isFolder(item)) continue;
    const uuid = getItemUuid(item)!;
    const old = previous.find((candidate) => getItemUuid(candidate) === uuid);
    if (!old || !isFolder(old)) continue;
    into.set(uuid, wasCollapsed(old));
    if (item.items && old.items) carryOver(item.items, old.items, wasCollapsed, into);
  }
};

export const createPlaygroundFolders = () => {
  const state = createObservable<PlaygroundFolderState>({ initial: { items: undefined, collapsed: new Map() } });

  const setCollapsed = (uuids: string[], value: (current: boolean) => boolean) => {
    const current = state.get();
    const collapsed = new Map(current.collapsed);
    let changed = false;
    for (const uuid of uuids) {
      const folder = findItemByUuid(current.items, uuid);
      if (!folder) continue;
      const was = isFolderCollapsed(current, folder);
      if (value(was) === was) continue;
      collapsed.set(uuid, !was);
      changed = true;
    }
    if (changed) state.set({ items: current.items, collapsed });
  };

  return {
    get: state.get,
    subscribe: state.subscribe,
    seed: (items: Item[] | undefined) => {
      const previous = state.get();
      const collapsed = new Map<string, boolean>();
      if (previous.items && items) {
        carryOver(items, previous.items, (folder) => isFolderCollapsed(previous, folder), collapsed);
      }
      state.set({ items, collapsed });
    },
    toggle: (uuid: string) => setCollapsed([uuid], (current) => !current),
    expand: (uuids: string[]) => setCollapsed(uuids, () => false)
  };
};
