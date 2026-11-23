import React, { createContext, useContext, useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import { buildNavModel } from '../routing/navModel';
import type { NavModel } from '../routing/types';

interface LoadedDocument {
  document: OpenCollection;
  navModel: NavModel;
}

const DocumentContext = createContext<LoadedDocument | null>(null);

export const DocumentProvider: React.FC<{ document: OpenCollection; children: React.ReactNode }> = ({
  document,
  children
}) => {
  const value = useMemo(() => ({ document, navModel: buildNavModel(document) }), [document]);
  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};

const useLoadedDocument = (): LoadedDocument => {
  const loaded = useContext(DocumentContext);
  if (!loaded) throw new Error('useDocument must be used inside <DocumentProvider>');
  return loaded;
};

export const useDocument = (): OpenCollection => useLoadedDocument().document;

export const useNavModel = (): NavModel => useLoadedDocument().navModel;
