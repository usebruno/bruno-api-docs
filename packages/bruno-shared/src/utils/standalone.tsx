import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CollectionShell from '../components/CollectionShell/CollectionShell';
import type { CollectionSource } from '../components/CollectionShell/useCollectionLoader';

export const injectInterFont = () => {
  if (document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) return;
  const links = [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
    }
  ];

  links.forEach((linkProps) => {
    const link = document.createElement('link');
    Object.entries(linkProps).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });
    document.head.appendChild(link);
  });
};

export interface ApiPlaygroundOptions {
  content: CollectionSource;
}

export interface ApiPlaygroundInstance {
  updateCollection: (content: CollectionSource) => void;
  destroy: () => void;
}

export const mountApiPlayground = (
  target: HTMLElement,
  { content }: ApiPlaygroundOptions,
  View: React.ComponentType
): ApiPlaygroundInstance => {
  if (!target) throw new Error('Target element is required');
  injectInterFont();
  let root: Root | null = createRoot(target);
  const render = (collection: CollectionSource) => {
    root?.render(
      <MemoryRouter useTransitions={false}>
        <CollectionShell collection={collection}>
          {() => <View />}
        </CollectionShell>
      </MemoryRouter>
    );
  };
  render(content);
  return {
    updateCollection: render,
    destroy: () => {
      root?.unmount();
      root = null;
    }
  };
};
