import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import {
  useCollectionData,
  useTheme,
  useRunnerMode
} from '../../hooks';
import type { OpenCollectionProps } from '../../types/component-types';
import Sidebar from '../Sidebar/Sidebar';
import AllEndpointsView from '../../ui/AllEndpointsView';
import PlaygroundDrawer from '../Playground/PlaygroudDrawer/PlaygroundDrawer';
import { getItemId, generateSafeId } from '../../utils/itemUtils';

interface DesktopLayoutProps {
  collectionData: OpenCollectionCollection | null;
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
  collectionData,
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
    if (!selectedItemId || !collectionData) return null;
    
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

    if (collectionData.items) {
      const item = findItem(collectionData.items);
      if (item && item.type === 'http') {
        return item as HttpRequest;
      }
    }
    return null;
  }, [selectedItemId, collectionData]);

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
    if (collectionData && collectionData.items) {
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

      const item = findItem(collectionData.items);
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
          collection={collectionData}
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
          collection={collectionData}
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
        collection={collectionData}
        selectedItem={playgroundItem}
        onSelectItem={handlePlaygroundItemSelect}
        theme={theme}
      />
    </div>
  );
};

const OpenCollection: React.FC<OpenCollectionProps> = ({
  collection,
  theme = 'light',
  logo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { collectionData, isLoading, error } = useCollectionData(collection);
  useTheme(theme);

  const filteredCollectionItems = collectionData?.items || [];

  // Page selection state
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [currentPageItem, setCurrentPageItem] = useState<any>(null);

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
    
    if (collectionData && 'items' in collectionData && collectionData.items) {
      const item = findItem(collectionData.items);
      setCurrentPageItem(item);
    }
  };

  // Set initial page to first root-level request when collection loads
  useEffect(() => {
    if (collectionData && currentPageId === null) {
      const items = collectionData.items as any[] | undefined;

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
  }, [collectionData, currentPageId]);

  const { isRunnerMode, toggleRunnerMode } = useRunnerMode();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  const commonProps = {
    collectionData,
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

export default OpenCollection;