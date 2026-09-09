import React, { useRef, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import { parseYaml } from '@/utils/yamlUtils';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectDocsCollection,
  setDocsCollection,
  clearDocsCollection
} from '@/store/slices/docs';
import {
  setPlaygroundCollection,
  clearPlaygroundCollection
} from '@/store/slices/playground';
import {
  selectCollectionStatus,
  selectCollectionError,
  setCollectionLoading,
  setCollectionSucceeded,
  setCollectionFailed,
  resetCollectionState,
  setGitCollectionUrl
} from '@/store/slices/app';
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
  /** The surface to mount over the loaded collection. */
  children: React.ReactNode;
}

const CollectionRootContent: React.FC<CollectionRootProps> = ({
  collection,
  gitCollectionUrl,
  children
}) => {
  const dispatch = useAppDispatch();
  const docsCollection = useAppSelector(selectDocsCollection);
  const collectionStatus = useAppSelector(selectCollectionStatus);
  const collectionError = useAppSelector(selectCollectionError);

  useEffect(() => {
    gitCollectionUrl && dispatch(setGitCollectionUrl(gitCollectionUrl));
  }, [gitCollectionUrl, dispatch]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      dispatch(setCollectionLoading());

      try {
        const resolved = await resolveCollectionSource(collection);
        if (!isActive) return;
        const hydrated = hydrateWithUUIDs(resolved);
        dispatch(setDocsCollection(hydrated));
        dispatch(setPlaygroundCollection(hydrated));
        dispatch(setCollectionSucceeded());
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Failed to load API collection';
        dispatch(setCollectionFailed(message));
        dispatch(clearDocsCollection());
        dispatch(clearPlaygroundCollection());
      }
    };

    if (collection == null) {
      dispatch(clearDocsCollection());
      dispatch(clearPlaygroundCollection());
      dispatch(resetCollectionState());
      return () => { isActive = false; };
    }

    if (isFileInstance(collection) || typeof collection === 'string') {
      void load();
    } else {
      const hydrated = hydrateWithUUIDs(collection as OpenCollectionCollection);
      dispatch(setDocsCollection(hydrated));
      dispatch(setPlaygroundCollection(hydrated));
      dispatch(setCollectionSucceeded());
    }

    return () => { isActive = false; };
  }, [collection, dispatch]);

  const isInitialLoad = collectionStatus === 'idle' && !docsCollection;
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
const CollectionRoot: React.FC<CollectionRootProps> = (props) => {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createOpenCollectionStore();
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
