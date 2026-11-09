import React, { useRef, useState } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import SidebarTree from '../../Docs/Sidebar/SidebarTree/SidebarTree';
import { useAutoHideScrollbar, useIsMobileDevice, usePlaygroundSearch } from '@/hooks';
import { SearchIcon, CloseIcon } from '@/assets/icons';
import type { ExampleHighlight } from '../../Docs/Sidebar/SidebarTree/SidebarTree';
import { StyledWrapper } from './StyledWrapper';

interface PlaygroundSidebarProps {
  collection: OpenCollectionCollection | null;
  activeSlug: string;
  uuidToSlug: Map<string, string>;
  onNavigate: (slug: string) => void;
  onToggleFolder: (uuid: string) => void;
  onExpandFolder: (uuid: string) => void;
  onOpenCollection: () => void;
  collectionActive: boolean;
  testId?: string;
  activeExample: ExampleHighlight | null;
  onExampleClick?: (requestUuid: string, index: number) => void;
}

const PlaygroundSidebar: React.FC<PlaygroundSidebarProps> = ({
  collection,
  activeSlug,
  uuidToSlug,
  onNavigate,
  onToggleFolder,
  onExpandFolder,
  onOpenCollection,
  collectionActive,
  testId = 'playground-sidebar',
  activeExample,
  onExampleClick
}) => {
  const [collectionCollapsed, setCollectionCollapsed] = useState(false);
  const name = collection?.info?.name || 'Collection';

  const { query, onSearchChange, isSearching, items, nameMatches, urlMatches, toggleFolder, expandFolder }
    = usePlaygroundSearch(collection, onToggleFolder, onExpandFolder);

  // Show the scrollbar while the tree is in use, then fade it after 1s idle - same as the docs sidebar.
  const treeRef = useRef<HTMLDivElement>(null);
  useAutoHideScrollbar(treeRef);

  // Smaller nav text on real phones/tablets only, not by window size.
  const isMobileDevice = useIsMobileDevice();

  return (
    <StyledWrapper className={isMobileDevice ? 'mobile' : undefined} data-testid={testId}>
      <div className="search">
        <span className="search-icon">
          <SearchIcon />
        </span>
        <input
          className="search-input"
          type="text"
          placeholder="Search requests"
          aria-label="Search requests"
          data-testid="playground-sidebar-search"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {query && (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onSearchChange('')}>
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="tree" ref={treeRef}>
        {isSearching && items.length === 0 ? (
          <div className="search-empty">No results found</div>
        ) : collection?.items ? (
          <SidebarTree
            items={items}
            activeSlug={activeSlug}
            uuidToSlug={uuidToSlug}
            onNavigate={onNavigate}
            onToggleFolder={toggleFolder}
            nameMatches={nameMatches}
            urlMatches={urlMatches}
            onExpandFolder={expandFolder}
            activeExample={activeExample}
            onExampleClick={onExampleClick}
            collectionRoot={{
              name,
              collapsed: collectionCollapsed && !isSearching,
              active: collectionActive,
              onToggle: () => {
                if (!isSearching) setCollectionCollapsed((v) => !v);
              },
              // Clicking the collection name opens its settings and reopens the
              // tree, the same way clicking a folder shows its contents.
              onClick: () => {
                setCollectionCollapsed(false);
                onOpenCollection();
              },
              testId: 'sidebar-collection-root'
            }}
          />
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default PlaygroundSidebar;
