import React, { useMemo } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, HttpRequest, Folder } from '@opencollection/types';
import Item from '../components/Docs/Item/Item';
import { getItemId, generateSafeId } from '../utils/itemUtils';

interface AllEndpointsViewProps {
  collection: OpenCollectionCollection | null;
  filteredCollectionItems: OpenCollectionItem[];
  theme: 'light' | 'dark' | 'auto';
  md: any;
  selectedItemId: string | null;
  onItemSelect?: (id: string, openPlayground?: boolean) => void;
}

const AllEndpointsView: React.FC<AllEndpointsViewProps> = ({
  collection,
  filteredCollectionItems,
  theme,
  md,
  selectedItemId,
  onItemSelect
}) => {
  // Flatten all items recursively for rendering
  const flattenItems = (items: OpenCollectionItem[], parentPath = ''): OpenCollectionItem[] => {
    const result: OpenCollectionItem[] = [];
    
    for (const item of items) {
      const itemId = getItemId(item);
      const itemPath = parentPath ? `${parentPath}/${itemId}` : itemId;
      
      // Add the item itself
      result.push(item);
      
      // If it's a folder, recursively add its children
      if (item.type === 'folder') {
        const folder = item as Folder;
        if (folder.items && folder.items.length > 0) {
          result.push(...flattenItems(folder.items, itemPath));
        }
      }
    }
    
    return result;
  };

  const allItems = useMemo(() => {
    const items = flattenItems(filteredCollectionItems);
    return items;
  }, [filteredCollectionItems]);

  const registerSectionRef = (id: string, ref: HTMLDivElement | null) => {
    // No-op for now, but can be used for scroll tracking
  };

  return (
    <div className="all-endpoints-view h-full overflow-y-auto" style={{ padding: '2rem', maxWidth: '100%' }}>
      {/* Render all collection items */}
      {allItems.map((item, index) => {
        const itemId = getItemId(item);
        const safeId = generateSafeId(itemId);
        const sectionId = `section-${safeId}`;
        const isSelected = selectedItemId === safeId || selectedItemId === itemId;

        return (
          <div
            key={`${itemId}-${index}`}
            id={sectionId}
            className={`endpoint-section mb-12 scroll-mt-20 ${isSelected ? 'selected' : ''}`}
          >
            <Item
              item={item}
              registerSectionRef={registerSectionRef}
              theme={theme}
              md={md}
              parentPath=""
              collection={collection || undefined}
              onTryClick={() => {
                // Select the item and trigger playground open
                onItemSelect?.(safeId, true);
                // Scroll to the item
                setTimeout(() => {
                  const element = document.getElementById(`section-${safeId}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
            />
          </div>
        );
      })}

      {allItems.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-2 text-sm font-medium">No content available</h3>
            <p className="mt-1 text-sm">No endpoints or pages found in this collection.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEndpointsView;

