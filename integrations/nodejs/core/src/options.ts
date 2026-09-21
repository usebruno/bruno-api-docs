export interface Filter {
  include?: string[] | '*';
  exclude?: string[];
}

export interface CollectionFilters {
  environments?: Filter;
  tags?: Filter;
}

export interface CollectionOptions extends CollectionFilters {
  collectionPath: string;
}

export interface RendererOptions {
  logo?: string;
  gitCollectionUrl?: string;
}

export interface ApiDocsOptions extends CollectionOptions, RendererOptions {
  pageTitle?: string;
}

export class ConfigError extends Error {}

const KNOWN_OPTIONS = new Set(['collectionPath', 'environments', 'tags', 'logo', 'gitCollectionUrl', 'pageTitle']);

export function validateOptions(options: ApiDocsOptions): void {
  const unknown = Object.keys(options).filter((key) => !KNOWN_OPTIONS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`apiDocs: unknown option ${unknown.join(', ')}`);
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
