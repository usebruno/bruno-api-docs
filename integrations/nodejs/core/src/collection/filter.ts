import { ConfigError, type CollectionOptions, type EnvironmentsOption, type TagsOption } from '../options';
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

const MANIFEST_FILE = /^opencollection\.ya?ml$/;
const ROOT_ENV_FILE = /^environments\/[^/]+\.ya?ml$/;
const ENV_DIR = /(^|\/)environments\//;
const FOLDER_FILE = /(^|\/)folder\.ya?ml$/;

export const isManifest = (p: string): boolean => MANIFEST_FILE.test(p);

const isRequestFile = (p: string): boolean => !isManifest(p) && !FOLDER_FILE.test(p) && !ENV_DIR.test(p);

export function environmentName(text: string): string | null {
  const doc = safeLoad(text);
  if (!doc || typeof doc.name !== 'string') return null;

  return doc.name;
}

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

export function applyFilters(files: WalkedFile[], filters: Omit<CollectionOptions, 'collection'>): FilterResult {
  const environments = filterEnvironments(files, filters.environments);
  const tags = filterTags(environments.files, filters.tags);

  return {
    files: tags.files,
    skipped: [...environments.skipped, ...tags.skipped],
    unknownEnvironments: environments.unknownEnvironments
  };
}

function filterEnvironments(files: WalkedFile[], option: EnvironmentsOption | undefined): FilterResult {
  const publishAll = option?.all === true;
  const include = new Set(option?.include ?? []);
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

    const name = environmentName(file.text);
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

function filterTags(files: WalkedFile[], option: TagsOption | undefined): FilterStage {
  const includeTags = option?.include ?? [];
  const excludeTags = option?.exclude ?? [];
  if (includeTags.length === 0 && excludeTags.length === 0) {
    return { files, skipped: [] };
  }

  const requests = partitionFiles(files, (file) => {
    if (!isRequestFile(file.path)) return null;

    const tags = requestTags(file.text);
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
