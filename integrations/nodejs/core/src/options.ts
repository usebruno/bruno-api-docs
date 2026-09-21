export interface Filter {
  include?: string[] | '*';
  exclude?: string[];
}

export interface CollectionFilters {
  /** Absent means none are published, as in the app and the CLI. Directory mode only. */
  environments?: Filter;
  tags?: Filter;
}

export interface CollectionOptions extends CollectionFilters {
  /**
   * A collection directory or one bundled .yml. Relative to the app's entry file, not the cwd;
   * after a build that is the built entry, so `dist/main.js` counts from `dist/`.
   */
  collectionPath: string;
}

/** What is handed to the renderer. Only what it reads: an option it ignores does nothing. */
export interface RendererOptions {
  logo?: string;
  gitCollectionUrl?: string;
}

export interface ApiDocsOptions extends CollectionOptions, RendererOptions {
  /** The `<title>` of the page we serve. Not sent to the renderer; it has no use for it. */
  pageTitle?: string;
}

export class ConfigError extends Error {}

const KNOWN_OPTIONS = new Set(['collectionPath', 'environments', 'tags', 'logo', 'gitCollectionUrl', 'pageTitle']);

/** A key we do not know is a typo or an option the renderer does not read yet. Either way, say so. */
export function validateOptions(options: ApiDocsOptions): void {
  const unknown = Object.keys(options).filter((key) => !KNOWN_OPTIONS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`apiDocs: unknown option ${unknown.join(', ')}`);
  }

  const env = options.environments;
  if (!env) return;

  if (!env.include?.length && env.exclude?.length) {
    throw new ConfigError("apiDocs: `environments.exclude` needs a base: set `include: '*'` or an `include` list");
  }
}
