// The collection layer's one entry point: where the document comes from is decided here, at startup.

import { ConfigError, type CollectionOptions } from '../options';
import { log } from '../log';
import type { SkippedFile } from './walk';
import { resolveCollectionSource } from './source';
import { fileProvider, dirProvider, type Provider, type BuiltProvider } from './providers';

export function providerFor(options: CollectionOptions): Provider {
  const source = resolveCollectionSource(options.collection);
  const filters = { environments: options.environments, tags: options.tags };

  // built first: a path that is not there is reported as missing, not as a filter mistake
  const built = source.mode === 'file' ? fileProvider(source.path) : dirProvider(source.path, filters);
  if (source.mode === 'file' && (filters.environments || filters.tags)) {
    throw new ConfigError('apiDocs: `environments` / `tags` filtering needs a collection directory');
  }
  report(source.path, built);

  return built.serve;
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
