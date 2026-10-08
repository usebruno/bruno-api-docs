import { dump } from 'js-yaml';
import { isFolder } from './schemaHelpers';
import type { OpenCollection } from '@opencollection/types';
import type { Item, Folder } from '@opencollection/types/collection/item';

const stripItem = (item: Item): Item => {
  const { uuid: _uuid, isCollapsed: _isCollapsed, ...rest } = item as Item & { uuid?: string; isCollapsed?: boolean };
  if (isFolder(item)) {
    const folder = rest as Folder;
    return folder.items ? { ...folder, items: folder.items.map(stripItem) } : folder;
  }
  return rest as Item;
};

export const stripHydration = (collection: OpenCollection): OpenCollection =>
  collection.items ? { ...collection, items: collection.items.map(stripItem) } : { ...collection };

export const serializeCollectionYaml = (collection: OpenCollection): string =>
  dump(collection, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });

const invalidFilenameCharacters = /[<>:"/\\|?*\p{Cc}]/gu;

export const collectionFilename = (collection: OpenCollection | null | undefined): string => {
  const name = (collection?.info?.name ?? '')
    .replace(invalidFilenameCharacters, '-')
    .replace(/^[\s-]+/, '')
    .replace(/[.\s]+$/, '');
  return name ? `${name}.yml` : 'collection.yml';
};

export const downloadTextFile = (filename: string, text: string): void => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: 'application/yaml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const looksLikeJson = (text: string): boolean => /^[[{]/.test(text.trim());

export const resolveDownloadYaml = (sourceText: string | null, collection: OpenCollection): string =>
  sourceText && !looksLikeJson(sourceText)
    ? sourceText
    : serializeCollectionYaml(stripHydration(collection));
