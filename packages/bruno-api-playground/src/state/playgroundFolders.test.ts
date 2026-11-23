import { describe, it, expect, vi } from 'vitest';
import type { Item } from '@opencollection/types/collection/item';
import { createPlaygroundFolders, isFolderCollapsed } from './playgroundFolders';

const folder = (uuid: string, items: Item[] = [], extra: Record<string, unknown> = {}): Item =>
  ({ type: 'folder', uuid, name: uuid, items, ...extra }) as unknown as Item;
const request = (uuid: string): Item => ({ type: 'http', uuid, name: uuid }) as unknown as Item;

const collapsed = (folders: ReturnType<typeof createPlaygroundFolders>, item: Item) =>
  isFolderCollapsed(folders.get(), item);

describe('playground folders', () => {
  it('starts every folder collapsed unless the item says otherwise', () => {
    const folders = createPlaygroundFolders();
    const open = folder('open', [], { isCollapsed: false });
    folders.seed([folder('a'), open]);
    expect(collapsed(folders, folder('a'))).toBe(true);
    expect(collapsed(folders, open)).toBe(false);
  });

  it('toggles a folder and expand only ever opens', () => {
    const folders = createPlaygroundFolders();
    folders.seed([folder('a')]);
    folders.toggle('a');
    expect(collapsed(folders, folder('a'))).toBe(false);
    folders.toggle('a');
    expect(collapsed(folders, folder('a'))).toBe(true);
    folders.expand(['a']);
    folders.expand(['a']);
    expect(collapsed(folders, folder('a'))).toBe(false);
  });

  it('ignores uuids that are not in the seeded items and does not notify for an open folder', () => {
    const folders = createPlaygroundFolders();
    folders.seed([folder('a')]);
    folders.expand(['a']);
    const listener = vi.fn();
    folders.subscribe(listener);

    folders.expand(['a', 'missing']);
    folders.toggle('missing');
    folders.expand([]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('a re-seed keeps the state of folders found at the same place by uuid', () => {
    const folders = createPlaygroundFolders();
    folders.seed([folder('a', [folder('b')]), folder('c')]);
    folders.toggle('a');
    folders.toggle('b');

    folders.seed([folder('a', [folder('b')]), folder('c')]);

    expect(collapsed(folders, folder('a'))).toBe(false);
    expect(collapsed(folders, folder('b'))).toBe(false);
    expect(collapsed(folders, folder('c'))).toBe(true);
  });

  it('a re-seed drops the state of a folder that moved under another parent or whose uuid changed', () => {
    const folders = createPlaygroundFolders();
    folders.seed([folder('a'), folder('b')]);
    folders.toggle('a');
    folders.toggle('b');

    folders.seed([folder('b', [folder('a')]), folder('c')]);

    expect(collapsed(folders, folder('b'))).toBe(false);
    expect(collapsed(folders, folder('a'))).toBe(true);
  });

  it('a seed after a clear starts from the defaults', () => {
    const folders = createPlaygroundFolders();
    folders.seed([folder('a'), request('r')]);
    folders.toggle('a');

    folders.seed(undefined);
    folders.seed([folder('a')]);

    expect(collapsed(folders, folder('a'))).toBe(true);
  });
});
