import React from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import '@usebruno/api-shared/styles/index.css';
// Import Prism (with our token customizations) to ensure it's bundled
import Prism from '@usebruno/api-shared/utils/prism';
import OpenCollection from './components/OpenCollection/OpenCollection';
import {
  injectInterFont,
  mountApiPlayground,
  parseContent,
  type ApiPlaygroundOptions
} from '@usebruno/api-shared/utils/standalone';
import ApiPlaygroundView from './components/Playground/ApiPlaygroundView';
import type { ThemeState } from '@usebruno/api-shared/theme/types';
import { isEmpty, isPlainObject } from 'lodash-es';

// Ensure Prism is available globally for any code that might access it
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export interface OpenCollectionOptions {
  target: HTMLElement;
  opencollection: any;
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

export type { ApiPlaygroundOptions, ApiPlaygroundInstance } from '@usebruno/api-shared/utils/standalone';

export class OpenCollectionRenderer {
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

  public updateCollection(opencollection: any) {
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
  const globals = window as any;
  globals.OpenCollection = DeprecatedOpenCollection;
  globals.Bruno = {
    ...globals.Bruno,
    build: __BRUNO_BUILD__,
    apiDocs: (target: HTMLElement, { content, repositoryUrl, gitCollectionUrl, ...options }: ApiDocsOptions) =>
      new OpenCollectionRenderer({
        target,
        opencollection: content,
        gitCollectionUrl: repositoryUrl ?? gitCollectionUrl,
        ...options
      }),
    apiPlayground: (target: HTMLElement, options: ApiPlaygroundOptions) =>
      mountApiPlayground(target, options, ApiPlaygroundView)
  };
}
