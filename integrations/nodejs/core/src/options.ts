export interface Filter {
  include?: string[] | '*';
  exclude?: string[];
}

export interface CollectionFilters {
  environments?: Filter;
  tags?: Filter;
}

/** Where the collection comes from, in priority order: the first one set is used. */
export const SOURCE_KEYS = ['content', 'url', 'collectionPath'] as const;
export type SourceKey = typeof SOURCE_KEYS[number];

export interface CollectionOptions extends CollectionFilters, Partial<Record<SourceKey, string>> {}

export interface RendererOptions {
  logo?: string;
  repositoryUrl?: string;
}

export interface ApiDocsOptions extends CollectionOptions, RendererOptions {
  pageTitle?: string;
}

export class ConfigError extends Error {}

const KNOWN_OPTIONS = new Set<string>([...SOURCE_KEYS, 'environments', 'tags', 'logo', 'repositoryUrl', 'pageTitle']);

export function validateOptions(options: ApiDocsOptions): void {
  const unknown = Object.keys(options).filter((key) => !KNOWN_OPTIONS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`apiDocs: unknown option ${unknown.join(', ')}`);
  }

  for (const key of SOURCE_KEYS) {
    if (options[key] !== undefined && typeof options[key] !== 'string') {
      throw new ConfigError(`apiDocs: \`${key}\` takes a string`);
    }
  }

  for (const name of ['environments', 'tags'] as const) {
    const filter = options[name];
    if (typeof filter?.include === 'string' && filter.include !== '*') {
      throw new ConfigError(`apiDocs: \`${name}.include\` takes a list of names or '*'`);
    }
  }

  const env = options.environments;
  const hasBase = env?.include === '*' || Boolean(env?.include?.length);
  if (env?.exclude?.length && !hasBase) {
    throw new ConfigError("apiDocs: `environments.exclude` needs a base: set `include: '*'` or an `include` list");
  }
}
