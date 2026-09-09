import React, { useRef, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import { parseYaml } from '@/utils/yamlUtils';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCollection,
  selectCollectionStatus,
  selectCollectionError,
  collectionLoading,
  collectionLoaded,
  collectionFailed,
  collectionCleared,
  setGitCollectionUrl
} from '@/store/slices/collection';
import type { ReducersMapObject } from '@reduxjs/toolkit';
import { createOpenCollectionStore, type AppStore } from '@/store/store';
import { VariableResolverProvider } from '@/hooks';
import { applyTheme } from '@/theme/applyTheme';

// Set data-theme on the root element before the component first paints to avoid a flash.
applyTheme();

const isFileInstance = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const parseCollectionContent = (content: string): OpenCollectionCollection => {
  try {
    return parseYaml(content) as OpenCollectionCollection;
  } catch {
    try {
      return JSON.parse(content) as OpenCollectionCollection;
    } catch {
      throw new Error('Failed to parse collection as YAML or JSON');
    }
  }
};

const resolveCollectionSource = async (
  source: OpenCollectionCollection | string | File
): Promise<OpenCollectionCollection> => {
  if (isFileInstance(source)) {
    const text = await source.text();
    return parseCollectionContent(text);
  }

  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`);
      }
      const text = await response.text();
      return parseCollectionContent(text);
    }

    return parseCollectionContent(source);
  }

  return source;
};

export interface CollectionRootProps {
  collection: IOpenCollection | string | File;
  gitCollectionUrl?: string;
  /** The slices owned by the surfaces this root mounts. Core slices are always present. */
  reducers?: ReducersMapObject;
  /** The surface to mount over the loaded collection. */
  children: React.ReactNode;
}

const CollectionRootContent: React.FC<Omit<CollectionRootProps, 'reducers'>> = ({
  collection,
  gitCollectionUrl,
  children
}) => {
  const dispatch = useAppDispatch();
  const document = useAppSelector(selectCollection);
  const collectionStatus = useAppSelector(selectCollectionStatus);
  const collectionError = useAppSelector(selectCollectionError);

  useEffect(() => {
    gitCollectionUrl && dispatch(setGitCollectionUrl(gitCollectionUrl));
  }, [gitCollectionUrl, dispatch]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      dispatch(collectionLoading());

      try {
        const resolved = await resolveCollectionSource(collection);
        if (!isActive) return;
        const hydrated = hydrateWithUUIDs(resolved);
        dispatch(collectionLoaded(hydrated));
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Failed to load API collection';
        dispatch(collectionFailed(message));
      }
    };

    if (collection == null) {
      dispatch(collectionCleared());
      return () => { isActive = false; };
    }

    if (isFileInstance(collection) || typeof collection === 'string') {
      void load();
    } else {
      const hydrated = hydrateWithUUIDs(collection as OpenCollectionCollection);
      dispatch(collectionLoaded(hydrated));
    }

    return () => { isActive = false; };
  }, [collection, dispatch]);

  const isInitialLoad = collectionStatus === 'idle' && !document;
  const isLoading = collectionStatus === 'loading' || isInitialLoad;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (collectionError) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {collectionError}</div>;
  }

  return <div className="oc-playground">{children}</div>;
};

/**
 * Everything a surface needs and neither surface owns: the store, the router, the
 * variable resolver, and the parsed collection. Docs and playground compose over
 * this rather than through each other.
 */
const CollectionRoot: React.FC<CollectionRootProps> = ({ reducers, ...props }) => {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    // Typed as the core store on purpose: shared code selects core state only,
    // and each surface types its own slice through its own selector hook.
    storeRef.current = createOpenCollectionStore(reducers) as AppStore;
  }

  return (
    <HashRouter useTransitions={false}>
      <Provider store={storeRef.current!}>
        <VariableResolverProvider>
          <CollectionRootContent {...props} />
        </VariableResolverProvider>
      </Provider>
    </HashRouter>
  );
};

export default CollectionRoot;
