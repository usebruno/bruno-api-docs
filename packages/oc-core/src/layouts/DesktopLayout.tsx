import React, { useState, useMemo } from 'react';
import { OpenCollectionCollection, CustomPage, OpenCollectionItem, HttpRequest } from '../types';
import SearchModal from '../ui/SearchModal';
import Sidebar from '../components/Sidebar/Sidebar';
import AllEndpointsView from '../ui/AllEndpointsView';
import PlaygroundDrawer from '../components/Playground/PlaygroudDrawer/PlaygroundDrawer';
import { getItemId, generateSafeId } from '../utils/itemUtils';

interface DesktopLayoutProps {
  collectionData: OpenCollectionCollection | null;
  hideSidebar: boolean;
  logo: React.ReactNode;
  theme: 'light' | 'dark' | 'auto';
  currentPageId: string | null;
  currentPageItem: OpenCollectionItem | CustomPage | null;
  onSelectItem: (id: string, path?: string) => void;
  filteredCustomPages: CustomPage[];
  onlyShow?: string[];
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Array<{id: string; name: string; path?: string; type: string}>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleSearchResultSelect: (result: {id: string; path?: string; type: string}) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  filteredCollectionItems: any[];
  md: any;
  customPageContents: Record<string, string>;
  children?: React.ReactNode;
  isRunnerMode?: boolean;
  toggleRunnerMode?: () => void;
  proxyUrl?: string;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  collectionData,
  hideSidebar,
  logo,
  theme,
  currentPageId,
  currentPageItem,
  onSelectItem,
  filteredCustomPages,
  onlyShow,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchInputRef,
  handleSearchResultSelect,
  containerRef,
  filteredCollectionItems,
  md,
  customPageContents,
  children,
  isRunnerMode,
  toggleRunnerMode,
  proxyUrl
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (currentPageId) {
      setSelectedItemId(currentPageId);
    }
  }, [currentPageId]);

  return (
    <div className="flex h-screen">
      <SearchModal
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        searchInputRef={searchInputRef}
        handleSearchResultSelect={handleSearchResultSelect}
      />
      
      {/* Left Pane: Sidebar */}
      {!hideSidebar && (
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
            customPages={filteredCustomPages}
            onlyShow={onlyShow}
          />
        </div>
      )}

      {/* Middle Pane: All Endpoints View */}
      <div
        className="playground-content h-full overflow-y-auto flex-1"
        ref={containerRef}
      >
        <AllEndpointsView
          collection={collectionData}
          filteredCollectionItems={filteredCollectionItems}
          filteredCustomPages={filteredCustomPages}
          customPageContents={customPageContents}
          theme={theme}
          md={md}
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
        proxyUrl={proxyUrl}
        theme={theme}
      />
    </div>
  );
};

export default DesktopLayout;