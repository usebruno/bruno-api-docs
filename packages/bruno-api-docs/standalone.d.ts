import type { ThemeState } from '@usebruno/api-shared/theme/types';
import type { CollectionSource } from '@usebruno/api-shared/components/CollectionShell/useCollectionLoader';
import type { ApiPlaygroundInstance, ApiPlaygroundOptions } from '@usebruno/api-shared/utils/standalone';

export type { ApiPlaygroundInstance, ApiPlaygroundOptions };

export interface OpenCollectionOptions {
  target: HTMLElement;
  opencollection: CollectionSource;
  logo?: string;
  gitCollectionUrl?: string;
  theme?: Partial<ThemeState>;
  hideThemeSwitcher?: boolean;
  hidePlayground?: boolean;
}

export interface ApiDocsOptions extends Omit<OpenCollectionOptions, 'target' | 'opencollection'> {
  content: OpenCollectionOptions['opencollection'];
  repositoryUrl?: string;
}

export interface ApiDocsInstance {
  updateCollection: (opencollection: CollectionSource) => void;
  updateOptions: (options?: Partial<Omit<OpenCollectionOptions, 'target'>>) => void;
  destroy: () => void;
}

export type BrunoBuild = Record<'sha' | 'ref' | 'version' | 'env' | 'run' | 'built_at', string | null>;

export interface Bruno {
  apiDocs: (target: HTMLElement, options: ApiDocsOptions) => ApiDocsInstance;
  apiPlayground: (target: HTMLElement, options: ApiPlaygroundOptions) => ApiPlaygroundInstance;
  build: BrunoBuild;
}

declare global {
  interface Window {
    Bruno: Bruno;
    /** @deprecated Use `Bruno.apiDocs(target, { content })`. */
    OpenCollection: new (options: OpenCollectionOptions) => ApiDocsInstance;
  }
}
