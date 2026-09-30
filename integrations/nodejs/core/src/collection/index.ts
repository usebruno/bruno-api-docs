// The collection layer's one entry point: where the document comes from is decided here, at startup.

import { ConfigError, SOURCE_KEYS, type SourceKey, type CollectionOptions, type CollectionFilters } from '../options';
import { log } from '../log';
import type { SkippedFile } from './walk';
import { resolveCollectionSource } from './source';
import { bundledProvider, fileProvider, dirProvider, type Provider, type BuiltProvider } from './providers';
import { parseCollectionUrl, fetchBundled } from './remote';

interface Built {
  provider: BuiltProvider;
  bundled: boolean;
  label: string;
}

const BUILD: Record<SourceKey, (value: string, filters: CollectionFilters) => Built> = {
  content: fromContent,
  url: fromUrl,
  collectionPath: fromPath
};

export function providerFor(options: CollectionOptions): Provider {
  const set = SOURCE_KEYS.filter((key) => options[key]);
  if (set.length === 0) {
    throw new ConfigError(`apiDocs: one of ${SOURCE_KEYS.map((key) => `\`${key}\``).join(', ')} is required`);
  }
  const [chosen, ...ignored] = set;
  for (const key of ignored) {
    log.warn(`${chosen} is set, ignoring ${key}`);
  }

  const filters = { environments: options.environments, tags: options.tags };
  const built = BUILD[chosen](options[chosen] as string, filters);
  if (built.bundled && (filters.environments || filters.tags)) {
    throw new ConfigError('apiDocs: `environments` / `tags` filtering needs a collection directory');
  }
  report(built.label, built.provider);

  return built.provider.serve;
}

function fromContent(text: string): Built {
  return { provider: bundledProvider(text, 'content'), bundled: true, label: 'content' };
}

function fromUrl(value: string): Built {
  const url = parseCollectionUrl(value);

  return { provider: bundledProvider(fetchBundled(url), url), bundled: true, label: url };
}

function fromPath(value: string, filters: CollectionFilters): Built {
  const source = resolveCollectionSource(value);
  // built first: a path that is not there is reported as missing, not as a filter mistake
  const provider = source.mode === 'file' ? fileProvider(source.path) : dirProvider(source.path, filters);

  return { provider, bundled: source.mode === 'file', label: source.path };
}

/**
 * Grouped by rule, because a collection folder with forty strays would otherwise print forty
 * lines. A group of one still shows its path, which is the case that matters: one unreadable file.
 */
function report(sourcePath: string, built: BuiltProvider): void {
  log.info(`serving ${built.fileCount} files from ${sourcePath}`);

  for (const [rule, paths] of groupByRule(built.skipped)) {
    const shown = paths.slice(0, 3).join(', ');
    const more = paths.length > 3 ? `, and ${paths.length - 3} more` : '';
    log.info(`  ${paths.length} skipped (${rule}): ${shown}${more}`);
  }

  for (const name of built.unknownEnvironments) {
    log.warn(`environments.exclude: no environment named "${name}"`);
  }
}

function groupByRule(skipped: SkippedFile[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of skipped) {
    const paths = groups.get(file.rule);
    if (paths) {
      paths.push(file.path);
    } else {
      groups.set(file.rule, [file.path]);
    }
  }

  return groups;
}
