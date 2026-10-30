import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Item, Folder, ScriptFile } from '@opencollection/types/collection/item';
import { getItemName, getHttpMethod, getRequestUrl, isFolder, isHttpRequest, isScriptFile } from '@/utils/schemaHelpers';
import { getAncestorsByUuid } from '@/utils/fileUtils';
import { getItemUuid } from '@/utils/itemUtils';
import { sanitizeName } from '@/utils/common';

/**
 * Find the folder ancestors from the collection root to a specific item (the item excluded).
 *
 * Resolution prefers the stable hydrated `uuid`: two requests can share the same
 * name+method+url (e.g. a copy in another folder), and matching by content would return the
 * wrong one's ancestor chain — and therefore inherit auth/headers/variables from the wrong
 * parent. `getAncestorsByUuid` returns [] when the uuid isn't in the collection (an unhydrated or
 * stale item), which resolves from the collection only — safer than content-matching to a possibly
 * wrong duplicate. Content matching is kept only as a fallback for input that carries no uuid.
 */
export const getTreePathFromCollectionToItem = (
  collection: OpenCollection,
  targetItem: HttpRequest
): Item[] => {
  const uuid = getItemUuid(targetItem);
  if (uuid) {
    return getAncestorsByUuid(collection, uuid);
  }

  const path: Item[] = [];

  const findItemPath = (items: Item[] | undefined, currentPath: Item[] = []): boolean => {
    if (!items) return false;

    for (const item of items) {
      const newPath = [...currentPath, item];

      if (isHttpRequest(item) && isSameHttpRequest(item as HttpRequest, targetItem)) {
        path.push(...newPath);
        return true;
      }

      if (isFolder(item)) {
        const folder = item as Folder;
        if (findItemPath(folder.items, newPath)) {
          return true;
        }
      }
    }

    return false;
  };

  findItemPath(collection.items);

  // Remove the target item itself from the path (we only want the path TO the item)
  return path.slice(0, -1);
};

export const findItemByPath = (collection: OpenCollection, requestPath: string): Item | null => {
  if (typeof requestPath !== 'string') return null;
  const normalized = requestPath.trim().replace(/^\/+/, '').replace(/\.(bru|ya?ml)$/i, '');
  const segments = normalized.split('/').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) return null;

  const walk = (items: Item[] | undefined, [head, ...rest]: string[]): Item | null => {
    if (!items) return null;
    if (!rest.length) {
      return items.find((item) => !isFolder(item) && getItemName(item) === head) ?? null;
    }
    const folder = items.find((item) => isFolder(item) && getItemName(item) === head);
    return folder ? walk((folder as Folder).items, rest) : null;
  };

  return walk(collection.items, segments);
};

export type ScriptFileLookup
  = | { found: true; code: string }
    | { found: false; reason: 'not-found' | 'outside-collection' };

const findFolderByName = (items: Item[] | undefined, segment: string) => {
  const folders = items?.filter(isFolder) as Folder[] | undefined;
  const namesOf = (folder: Folder) => [getItemName(folder) ?? '', sanitizeName(getItemName(folder) ?? '')];
  return folders?.find((folder) => getItemName(folder) === segment)
    ?? folders?.find((folder) => sanitizeName(getItemName(folder) ?? '') === segment)
    ?? folders?.find((folder) => namesOf(folder).some((name) => name.toLowerCase() === segment.toLowerCase()));
};

const findScriptByName = (items: Item[] | undefined, fileName: string) => {
  const scripts = items?.filter(isScriptFile) as ScriptFile[] | undefined;
  const nameOf = (script: ScriptFile) => getItemName(script)?.replace(/\.js$/i, '');
  return scripts?.find((script) => nameOf(script) === fileName)
    ?? scripts?.find((script) => nameOf(script)?.toLowerCase() === fileName.toLowerCase());
};

export const findScriptFileByPath = (collection: OpenCollection, modulePath: string): ScriptFileLookup => {
  if (typeof modulePath !== 'string') return { found: false, reason: 'not-found' };

  const segments: string[] = [];
  for (const segment of modulePath.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (!segments.length) return { found: false, reason: 'outside-collection' };
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const fileName = segments.pop()?.replace(/\.js$/i, '');
  if (!fileName) return { found: false, reason: 'not-found' };
  let items = collection.items;
  for (const segment of segments) {
    items = findFolderByName(items, segment)?.items;
  }
  const script = findScriptByName(items, fileName);
  return script ? { found: true, code: script.script ?? '' } : { found: false, reason: 'not-found' };
};

/**
 * Check if two HTTP requests are the same (for finding items in tree)
 */
const isSameHttpRequest = (item1: HttpRequest, item2: HttpRequest): boolean => {
  return (
    getItemName(item1) === getItemName(item2)
    && getHttpMethod(item1) === getHttpMethod(item2)
    && getRequestUrl(item1) === getRequestUrl(item2)
  );
};
