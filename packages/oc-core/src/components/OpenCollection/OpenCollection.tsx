import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import {
  useTheme,
  useRunnerMode
} from '../../hooks';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import Sidebar from '../Sidebar/Sidebar';
import AllEndpointsView from '../../ui/AllEndpointsView';
import PlaygroundDrawer from '../Playground/PlaygroudDrawer/PlaygroundDrawer';
import { getItemId, generateSafeId } from '../../utils/itemUtils';
import { parseYaml } from '../../utils/yamlUtils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectDocsCollection,
  setDocsCollection,
  clearDocsCollection
} from '@slices/docs';
import {
  selectPlaygroundCollection,
  setPlaygroundCollection,
  clearPlaygroundCollection
} from '@slices/playground';
import {
  selectCollectionStatus,
  selectCollectionError,
  setCollectionLoading,
  setCollectionSucceeded,
  setCollectionFailed,
  resetCollectionState
} from '@slices/app';
import { createOpenCollectionStore, type AppStore } from '../../store/store';

const isFileInstance = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const parseCollectionContent = (content: string): OpenCollectionCollection => {
  try {
    return parseYaml(content) as OpenCollectionCollection;
  } catch (yamlError) {
    try {
      return JSON.parse(content) as OpenCollectionCollection;
    } catch (jsonError) {
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

interface DesktopLayoutProps {
  docsCollection: OpenCollectionCollection | null;
  playgroundCollection: OpenCollectionCollection | null;
  logo: React.ReactNode;
  theme: 'light' | 'dark' | 'auto';
  currentPageId: string | null;
  currentPageItem: OpenCollectionItem | null;
  onSelectItem: (id: string, path?: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  filteredCollectionItems: any[];
  children?: React.ReactNode;
  isRunnerMode?: boolean;
  toggleRunnerMode?: () => void;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  docsCollection,
  playgroundCollection,
  logo,
  theme,
  currentPageId,
  onSelectItem,
  containerRef,
  filteredCollectionItems
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(currentPageId);
  const [playgroundItem, setPlaygroundItem] = useState<HttpRequest | null>(null);
  const [showPlaygroundDrawer, setShowPlaygroundDrawer] = useState(false);

  // Find the selected item for playground
  const selectedItem = useMemo(() => {
    if (!selectedItemId || !docsCollection) return null;
    
    const findItem = (items: any[]): any => {
      for (const item of items) {
        const itemId = getItemId(item);
        const safeId = generateSafeId(itemId);
        if (itemId === selectedItemId || safeId === selectedItemId) {
          return item;
        }
        if (item.type === 'folder' && item.items) {
          const found = findItem(item.items);
          if (found) return found;
        }
      }
      return null;
    };

    if (docsCollection.items) {
      const item = findItem(docsCollection.items);
      if (item && item.type === 'http') {
        return item as HttpRequest;
      }
    }
    return null;
  }, [selectedItemId, docsCollection]);

  // Update playground item when selection changes
  useEffect(() => {
    if (selectedItem && selectedItem.type === 'http') {
      setPlaygroundItem(selectedItem);
      // If drawer is open and we select a new HTTP item, update it
      if (showPlaygroundDrawer) {
        // Item is already set, drawer will update automatically
      }
    }
  }, [selectedItem, showPlaygroundDrawer]);

  const handleItemSelect = (id: string, openPlayground = false) => {
    setSelectedItemId(id);
    onSelectItem(id);
    
    // Find the item to set as playground item if it's an HTTP request
    const collectionItems = playgroundCollection?.items ?? docsCollection?.items;
    if (collectionItems) {
      const findItem = (items: any[]): any => {
        for (const item of items) {
          const itemId = getItemId(item);
          const safeId = generateSafeId(itemId);
          if (itemId === id || safeId === id) {
            return item;
          }
          if (item.type === 'folder' && item.items) {
            const found = findItem(item.items);
            if (found) return found;
          }
        }
        return null;
      };

      const item = findItem(collectionItems);
      if (item && item.type === 'http') {
        setPlaygroundItem(item as HttpRequest);
        if (openPlayground) {
          setShowPlaygroundDrawer(true);
        }
      }
    }
    
    // Scroll to the selected item after a short delay to ensure DOM is updated
    setTimeout(() => {
      const element = document.getElementById(`section-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handlePlaygroundItemSelect = (item: HttpRequest) => {
    // Only update the playground item, don't affect the docs view
    setPlaygroundItem(item);
  };

  // Sync with external currentPageId changes
  useEffect(() => {
    if (currentPageId) {
      setSelectedItemId(currentPageId);
    }
  }, [currentPageId]);

  return (
    <div className="flex h-screen">
      {/* Left Pane: Sidebar */}
      <div
        className="playground-sidebar h-full overflow-hidden flex flex-shrink-0"
        style={{
          width: 'var(--sidebar-width)',
          transition: 'width 0.3s ease',
          borderRight: '1px solid var(--border-color)'
        }}
      >
        <Sidebar
          collection={docsCollection}
          activeItemId={selectedItemId}
          onSelectItem={(id) => handleItemSelect(id, false)}
          logo={logo}
          theme={theme}
        />
      </div>

      {/* Middle Pane: All Endpoints View */}
      <div
        className="playground-content h-full overflow-y-auto flex-1"
        ref={containerRef}
      >
        <AllEndpointsView
          collection={docsCollection}
          collectionItems={filteredCollectionItems}
          theme={theme}
          selectedItemId={selectedItemId}
          onItemSelect={(id, openPlayground) => handleItemSelect(id, openPlayground || false)}
        />
      </div>

      {/* Bottom Drawer: Playground */}
      <PlaygroundDrawer
        isOpen={showPlaygroundDrawer}
        onClose={() => setShowPlaygroundDrawer(false)}
        collection={playgroundCollection}
        selectedItem={playgroundItem}
        onSelectItem={handlePlaygroundItemSelect}
        theme={theme}
      />
    </div>
  );
};

/**
 * OpenCollection React component props
 */
export interface OpenCollectionProps {
  collection: IOpenCollection | string | File;
  theme?: 'light' | 'dark' | 'auto';
  logo?: React.ReactNode;
}

const OpenCollectionContent: React.FC<OpenCollectionProps> = ({
  collection,
  theme = 'light',
  logo,
}) => {
  const dispatch = useAppDispatch();
  const docsCollection = useAppSelector(selectDocsCollection);
  const playgroundCollection = useAppSelector(selectPlaygroundCollection);
  const collectionStatus = useAppSelector(selectCollectionStatus);
  const collectionError = useAppSelector(selectCollectionError);
  const containerRef = useRef<HTMLDivElement>(null);

  useTheme(theme);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      dispatch(setCollectionLoading());

      try {
        const resolved = await resolveCollectionSource(collection);
        if (!isActive) {
          return;
        }
        dispatch(setDocsCollection(resolved));
        dispatch(setPlaygroundCollection(resolved));
        dispatch(setCollectionSucceeded());
      } catch (err) {
        if (!isActive) {
          return;
        }
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
      return () => {
        isActive = false;
      };
    }

    if (isFileInstance(collection) || typeof collection === 'string') {
      void load();
    } else {
      dispatch(setDocsCollection(collection as OpenCollectionCollection));
      dispatch(setPlaygroundCollection(collection as OpenCollectionCollection));
      dispatch(setCollectionSucceeded());
    }

    return () => {
      isActive = false;
    };
  }, [collection, dispatch]);

  const filteredCollectionItems = docsCollection?.items || [];

  // Page selection state
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [currentPageItem, setCurrentPageItem] = useState<any>(null);

  const isInitialLoad =
    collectionStatus === 'idle' && !docsCollection && !playgroundCollection;
  const isLoading = collectionStatus === 'loading' || isInitialLoad;
  const error = collectionError;

  // Handle item selection
  const handleSelectItem = (id: string, path?: string) => {
    console.log('Selecting item:', id, 'path:', path);
    setCurrentPageId(id);
    
    // Find the item in the collection
    const findItem = (items: any[]): any => {
      for (const item of items) {
        const itemId = item.id || item.uid || item.name || 'unnamed-item';
        if (itemId === id || itemId.toLowerCase().replace(/[^a-z0-9\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') === id) {
          return item;
        }
        if (item.type === 'folder' && item.items) {
          const found = findItem(item.items);
          if (found) return found;
        }
      }
      return null;
    };
    
    if (docsCollection && 'items' in docsCollection && docsCollection.items) {
      const item = findItem(docsCollection.items);
      setCurrentPageItem(item);
    }
  };

  // Set initial page to first root-level request when collection loads
  useEffect(() => {
    if (docsCollection && currentPageId === null) {
      const items = docsCollection.items as any[] | undefined;

      const firstRequest = items?.find((item) => item.type === 'http');
      if (firstRequest?.name) {
        handleSelectItem(firstRequest.name);
      } else if (items && items.length > 0) {
        const firstItem = items[0];
        if (firstItem && 'name' in firstItem && firstItem.name) {
          handleSelectItem(firstItem.name);
        }
      }
    }
  }, [docsCollection, currentPageId]);

  const { isRunnerMode, toggleRunnerMode } = useRunnerMode();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  const commonProps = {
    docsCollection,
    playgroundCollection,
    theme,
    currentPageId,
    currentPageItem,
    onSelectItem: handleSelectItem,
    containerRef,
    filteredCollectionItems
  };

  const desktopProps = {
    ...commonProps,
    logo,
    isRunnerMode,
    toggleRunnerMode
  };

  return (
    <div className={`oc-playground ${theme}`}>
      <DesktopLayout {...desktopProps} />
    </div>
  );
};

const OpenCollection: React.FC<OpenCollectionProps> = (props) => {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createOpenCollectionStore();
  }

  return (
    <Provider store={storeRef.current!}>
      <OpenCollectionContent {...props} />
    </Provider>
  );
};

export default OpenCollection;