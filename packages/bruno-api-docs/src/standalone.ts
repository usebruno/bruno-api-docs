import React from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import '@usebruno/api-shared/styles/index.css';
// Import Prism (with our token customizations) to ensure it's bundled
import Prism from '@usebruno/api-shared/utils/prism';
import OpenCollection from './components/OpenCollection/OpenCollection';
import { injectInterFont, mountApiPlayground } from '@usebruno/api-shared/utils/standalone';
import type { ApiDocsInstance, ApiDocsOptions, ApiPlaygroundOptions, Bruno, OpenCollectionOptions } from '../standalone';
import { parseCollectionContent } from '@usebruno/api-shared/utils/yamlUtils';
import type { CollectionSource } from '@usebruno/api-shared/components/CollectionShell/useCollectionLoader';
import ApiPlaygroundView from './components/Playground/ApiPlaygroundView';
import { isEmpty, isPlainObject } from 'lodash-es';

// Ensure Prism is available globally for any code that might access it
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export type { ApiDocsInstance, ApiDocsOptions, ApiPlaygroundInstance, ApiPlaygroundOptions, OpenCollectionOptions } from '../standalone';

const parseContent = (content: CollectionSource): CollectionSource => {
  if (typeof content !== 'string') return content;
  try {
    return parseCollectionContent(content);
  } catch (error) {
    console.error('Failed to parse collection:', error);
    throw new Error(`Invalid collection format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export class OpenCollectionRenderer implements ApiDocsInstance {
  private root: Root | null = null;
  private options: OpenCollectionOptions;

  constructor(options: OpenCollectionOptions) {
    this.options = options;
    this.init();
  }

  private init() {
    if (!this.options.target) {
      throw new Error('Target element is required');
    }

    injectInterFont();
    this.root = createRoot(this.options.target);
    this.render();
  }

  private createLogoElement(): React.ReactNode {
    if (!this.options.logo) return undefined;

    return React.createElement('img', {
      src: this.options.logo,
      alt: 'Logo',
      style: { height: '32px', width: 'auto' }
    });
  }

  private render() {
    if (!this.root) return;

    const collection = parseContent(this.options.opencollection);

    this.root.render(React.createElement(OpenCollection, {
      collection,
      logo: this.createLogoElement(),
      gitCollectionUrl: this.options.gitCollectionUrl,
      theme: this.options.theme,
      hideThemeSwitcher: this.options.hideThemeSwitcher,
      hidePlayground: this.options.hidePlayground
    }));
  }

  public updateCollection(opencollection: CollectionSource) {
    this.options.opencollection = opencollection;
    this.render();
  }

  public updateOptions(options: Partial<Omit<OpenCollectionOptions, 'target'>> = {}) {
    if (isPlainObject(options) && !isEmpty(options)) {
      this.options = {
        ...this.options,
        ...options
      };
      this.render();
    }
  }

  public destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

export default OpenCollectionRenderer;

let warnedDeprecated = false;

class DeprecatedOpenCollection extends OpenCollectionRenderer {
  constructor(options: OpenCollectionOptions) {
    if (!warnedDeprecated) {
      warnedDeprecated = true;
      // window.console: the standalone build drops bare console.* calls (terser drop_console)
      window.console.warn('[Bruno API Docs] window.OpenCollection is deprecated and will be removed in a future release. Use Bruno.apiDocs(target, { content }) instead.');
    }
    super(options);
  }
}

if (typeof window !== 'undefined') {
  const existing = window.Bruno as Partial<Bruno> | undefined;
  window.OpenCollection = DeprecatedOpenCollection;
  window.Bruno = {
    ...existing,
    build: __BRUNO_BUILD__,
    apiDocs: (target: HTMLElement, { content, repositoryUrl, gitCollectionUrl, ...options }: ApiDocsOptions) =>
      new OpenCollectionRenderer({
        target,
        opencollection: content,
        gitCollectionUrl: repositoryUrl ?? gitCollectionUrl,
        ...options
      }),
    apiPlayground: existing?.apiPlayground
      ?? ((target: HTMLElement, options: ApiPlaygroundOptions) =>
        mountApiPlayground(target, options, ApiPlaygroundView))
  };
}
