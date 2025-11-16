import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import './styles/index.css';
import OpenCollection from './components/OpenCollection/OpenCollection';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import { parseCollectionContent } from './utils/yamlUtils';

export interface OpenCollectionOptions {
  target: HTMLElement;
  opencollection: any;
  theme?: 'light' | 'dark' | 'auto';
  logo?: string;
}

export class OpenCollectionRenderer {
  private root: Root | null = null;
  private options: OpenCollectionOptions;

  constructor(options: OpenCollectionOptions) {
    this.options = options;
    this.init();
  }

  private injectInterFont() {
    // Only inject if not already present
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const links = [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
        { 
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
        }
      ];

      links.forEach(linkProps => {
        const link = document.createElement('link');
        Object.entries(linkProps).forEach(([key, value]) => {
          link.setAttribute(key, value);
        });
        document.head.appendChild(link);
      });
    }
  }

  private init() {
    if (!this.options.target) {
      throw new Error('Target element is required');
    }

    this.injectInterFont();
    this.root = createRoot(this.options.target);
    this.render();
  }

  private convertCollection(opencollection: any): IOpenCollection {
    if (typeof opencollection === 'string') {
      try {
        return parseCollectionContent(opencollection) as IOpenCollection;
      } catch (error) {
        console.error('Failed to parse collection:', error);
        throw new Error(`Invalid collection format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return opencollection as IOpenCollection;
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

    const collection = this.convertCollection(this.options.opencollection);
    
    this.root.render(React.createElement(OpenCollection, {
      collection,
      theme: this.options.theme || 'light',
      logo: this.createLogoElement()
    }));
  }

  public updateCollection(opencollection: any) {
    this.options.opencollection = opencollection;
    this.render();
  }

  public updateTheme(theme: 'light' | 'dark' | 'auto') {
    this.options.theme = theme;
    this.render();
  }

  public destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

export default OpenCollectionRenderer;

if (typeof window !== 'undefined') {
  (window as any).OpenCollection = OpenCollectionRenderer;
} 