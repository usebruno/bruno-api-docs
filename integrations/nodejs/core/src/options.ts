export interface EnvironmentsOption {
  all?: true;
  include?: string[];
  exclude?: string[];
}

export interface TagsOption {
  include?: string[];
  exclude?: string[];
}

export interface CollectionOptions {
  /** A collection directory or one bundled .yml. Relative to the app's entry file, not the cwd. */
  collection: string;
  /** Environments to publish. Absent means none, as in the app and the CLI. Directory mode only. */
  environments?: EnvironmentsOption;
  tags?: TagsOption;
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

export function validateOptions(options: CollectionOptions): void {
  const env = options.environments;
  if (!env) return;

  const hasInclude = Boolean(env.include?.length);
  const hasExclude = Boolean(env.exclude?.length);
  if (env.all && hasInclude) {
    throw new ConfigError('apiDocs: `environments.all` and `environments.include` cannot be combined');
  }
  if (!env.all && !hasInclude && hasExclude) {
    throw new ConfigError('apiDocs: `environments.exclude` needs a base: set `all: true` or an `include` list');
  }
}
