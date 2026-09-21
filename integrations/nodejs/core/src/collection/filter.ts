import { ConfigError, type CollectionFilters, type Filter } from '../options';
import type { WalkedFile, SkippedFile } from './walk';
import { safeLoad } from './yaml';

interface FilterStage {
  files: WalkedFile[];
  skipped: SkippedFile[];
}

export interface FilterResult extends FilterStage {
  unknownEnvironments: string[];
}

/** The reason this file is not published, or `null` to publish it. */
type SkipReason = (file: WalkedFile) => string | null;

const MANIFEST_FILE = /^(opencollection\.ya?ml|bruno\.json)$/;
const COLLECTION_FILE = /^(opencollection\.ya?ml|bruno\.json|collection\.bru)$/;
const ROOT_ENV_FILE = /^environments\/[^/]+\.(ya?ml|bru)$/;
const ENV_DIR = /(^|\/)environments\//;
const FOLDER_FILE = /(^|\/)folder\.(ya?ml|bru)$/;
const META_BLOCK = /^meta \{\n([\s\S]*?)\n\}/;
const META_TAGS = /^\s*tags: \[\n([\s\S]*?)\n\s*\]/m;

export const isManifest = (p: string): boolean => MANIFEST_FILE.test(p);
const isBru = (p: string): boolean => p.endsWith('.bru');

const namesOf = (include: Filter['include']): string[] => (Array.isArray(include) ? include : []);

const isRequestFile = (p: string): boolean => !COLLECTION_FILE.test(p) && !FOLDER_FILE.test(p) && !ENV_DIR.test(p);

export function environmentName(text: string): string | null {
  const doc = safeLoad(text);
  if (!doc || typeof doc.name !== 'string') return null;

  return doc.name;
}

/** A .bru environment is named by its file; the yml one names itself. */
const environmentNameOf = (file: WalkedFile): string | null =>
  isBru(file.path) ? file.path.slice(file.path.lastIndexOf('/') + 1, -'.bru'.length) : environmentName(file.text);

/** The tags in a request's `meta { ... }` block. `null` when there is no such block to read. */
export function bruMetaTags(text: string): string[] | null {
  const meta = META_BLOCK.exec(text);
  if (!meta) return null;

  const tags = META_TAGS.exec(meta[1]);
  if (!tags) return [];

  return tags[1].split('\n').map((line) => line.trim()).filter(Boolean);
}

const requestTagsOf = (file: WalkedFile): string[] | null =>
  isBru(file.path) ? bruMetaTags(file.text) : requestTags(file.text);

/** `null` means the tags could not be read, which is not the same as carrying none. */
export function requestTags(text: string): string[] | null {
  const doc = safeLoad(text);
  if (!doc) return null;

  const info = doc.info as Record<string, unknown> | undefined;
  const tags = info?.tags;
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) return null;

  return tags as string[];
}

/** Ported from bruno-common so the docs hide exactly what the app and the CLI hide. */
export function isRequestTagsIncluded(tags: string[], includeTags: string[], excludeTags: string[]): boolean {
  const shouldInclude = includeTags.length === 0 || tags.some((tag) => includeTags.includes(tag));
  const shouldExclude = excludeTags.length > 0 && tags.some((tag) => excludeTags.includes(tag));

  return shouldInclude && !shouldExclude;
}

function partitionFiles(files: WalkedFile[], skipReason: SkipReason): FilterStage {
  const kept: WalkedFile[] = [];
  const skipped: SkippedFile[] = [];

  for (const file of files) {
    const rule = skipReason(file);
    if (rule === null) {
      kept.push(file);
    } else {
      skipped.push({ path: file.path, rule });
    }
  }

  return { files: kept, skipped };
}

export function applyFilters(files: WalkedFile[], filters: CollectionFilters): FilterResult {
  const environments = filterEnvironments(files, filters.environments);
  const tags = filterTags(environments.files, filters.tags);

  return {
    files: tags.files,
    skipped: [...environments.skipped, ...tags.skipped],
    unknownEnvironments: environments.unknownEnvironments
  };
}

function filterEnvironments(files: WalkedFile[], option: Filter | undefined): FilterResult {
  const publishAll = option?.include === '*';
  const include = new Set(namesOf(option?.include));
  const exclude = new Set(option?.exclude ?? []);
  const seen = new Set<string>();

  const environments = partitionFiles(files, (file) => {
    if (!ROOT_ENV_FILE.test(file.path)) {
      if (ENV_DIR.test(file.path)) {
        return 'nested environments directory';
      }
      return null;
    }

    // dropping unread is what keeps the server from parsing any YAML unless a filter is configured
    if (!option) {
      return 'environments not published by default';
    }

    const name = environmentNameOf(file);
    if (name === null) {
      return 'environment file without a name';
    }
    seen.add(name);

    if (!publishAll && !include.has(name)) {
      return 'environment not included';
    }
    if (exclude.has(name)) {
      return 'environment excluded';
    }

    return null;
  });

  const missing = [...include].filter((name) => !seen.has(name));
  if (missing.length > 0) {
    throw new ConfigError(`apiDocs: environments.include names not found in the collection: ${missing.join(', ')}`);
  }

  return { ...environments, unknownEnvironments: [...exclude].filter((name) => !seen.has(name)) };
}

function filterTags(files: WalkedFile[], option: Filter | undefined): FilterStage {
  const includeTags = namesOf(option?.include);
  const excludeTags = option?.exclude ?? [];
  if (includeTags.length === 0 && excludeTags.length === 0) {
    return { files, skipped: [] };
  }

  const requests = partitionFiles(files, (file) => {
    if (!isRequestFile(file.path)) return null;

    const tags = requestTagsOf(file);
    // fail closed: a request we cannot read the tags of might be one the filter was meant to hide
    if (tags === null) {
      return 'request file unreadable while filtering by tags';
    }
    if (!isRequestTagsIncluded(tags, includeTags, excludeTags)) {
      return 'request excluded by tags';
    }

    return null;
  });

  const survivingPaths = requests.files.filter((file) => isRequestFile(file.path)).map((file) => file.path);
  const hasRequestBelow = (folderPath: string): boolean => {
    // the trailing slash is load bearing: 'admin/' must not match 'admin2/ping.yml'
    const dir = folderPath.slice(0, folderPath.lastIndexOf('/') + 1);

    return survivingPaths.some((p) => p.startsWith(dir));
  };

  const folders = partitionFiles(requests.files, (file) => {
    if (!FOLDER_FILE.test(file.path)) return null;
    if (hasRequestBelow(file.path)) return null;

    return 'folder with no surviving request';
  });

  return { files: folders.files, skipped: [...requests.skipped, ...folders.skipped] };
}
