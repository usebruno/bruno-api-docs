import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, Folder } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import Playground from '../Playground';
import Sidebar from '../Sidebar/Sidebar';
import { hydrateWithUUIDs, findAndUpdateItem } from '../../../utils/items';
import { StyledBackdrop, StyledDrawer, StyledDragBar } from './StyledWrapper';

interface PlaygroundDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  collection: OpenCollectionCollection | null;
  selectedItem: HttpRequest | null;
  onSelectItem: (item: HttpRequest) => void;
}

const MIN_HEIGHT = 300;

const getMaxHeight = () => window.innerHeight;
const getDefaultHeight = () => window.innerHeight * 0.9;

const PlaygroundDrawer: React.FC<PlaygroundDrawerProps> = ({
  isOpen,
  onClose,
  collection,
  selectedItem,
  onSelectItem
}) => {
  const [height, setHeight] = useState(() => isOpen ? getDefaultHeight() : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hydratedCollection, setHydratedCollection] = useState<OpenCollectionCollection | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  // Hydrate collection with UUIDs and initialize collapsed state
  useEffect(() => {
    if (!collection) {
      setHydratedCollection(null);
      return;
    }
    
    const hydrated = hydrateWithUUIDs(collection);
    
    // Initialize isCollapsed for all folders
    const initializeCollapsedState = (items: OpenCollectionItem[] | undefined): void => {
      if (!items) return;
      
      for (const item of items) {
        if ('type' in item && item.type === 'folder') {
          // Initialize isCollapsed to true (collapsed) if not already set
          if ((item as any).isCollapsed === undefined) {
            (item as any).isCollapsed = true;
          }
          const folder = item as Folder;
          if (folder.items) {
            initializeCollapsedState(folder.items);
          }
        }
      }
    };
    
    if (hydrated.items) {
      initializeCollapsedState(hydrated.items);
    }
    
    setHydratedCollection(hydrated);
  }, [collection]);

  // Update selectedItemId when selectedItem changes
  useEffect(() => {
    if (!selectedItem || !hydratedCollection) {
      setSelectedItemId(null);
      return;
    }
    
    // Find the UUID of the selected item
    const findItemUUID = (items: OpenCollectionItem[] | undefined): string | null => {
      if (!items) return null;
      
      for (const item of items) {
        const itemUuid = (item as any).uuid;
        // Compare by checking if this is the selected item
        if (itemUuid && 'type' in item && (item as any).type === 'http') {
          const httpItem = item as HttpRequest;
          if (httpItem.name === selectedItem.name && 
              httpItem.method === selectedItem.method &&
              httpItem.url === selectedItem.url) {
            return itemUuid;
          }
        }
        
        if ('type' in item && (item as any).type === 'folder') {
          const folder = item as Folder;
          if (folder.items) {
            const found = findItemUUID(folder.items);
            if (found) return found;
          }
        }
      }
      
      return null;
    };
    
    const uuid = findItemUUID(hydratedCollection.items);
    setSelectedItemId(uuid);
  }, [selectedItem, hydratedCollection]);

  const toggleFolder = useCallback((uuid: string) => {
    if (!hydratedCollection?.items) return;
    
    setHydratedCollection((prev) => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      findAndUpdateItem(updated.items, uuid, (item) => {
        const currentCollapsed = (item as any).isCollapsed ?? true;
        (item as any).isCollapsed = !currentCollapsed;
      });
      
      return updated;
    });
  }, [hydratedCollection]);

  const handleSelectItem = useCallback((uuid: string) => {
    if (!hydratedCollection?.items) return;
    
    // Find the item by UUID
    let foundItem: HttpRequest | null = null;
    
    const findItem = (items: OpenCollectionItem[] | undefined): boolean => {
      if (!items) return false;
      
      for (const item of items) {
        const itemUuid = (item as any).uuid;
        if (itemUuid === uuid && 'type' in item && (item as any).type === 'http') {
          foundItem = item as HttpRequest;
          return true;
        }
        
        if ('type' in item && (item as any).type === 'folder') {
          const folder = item as Folder;
          if (folder.items && findItem(folder.items)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    findItem(hydratedCollection.items);
    
    if (foundItem) {
      onSelectItem(foundItem);
    }
  }, [hydratedCollection, onSelectItem]);


  useEffect(() => {
    if (isOpen) {
      // When opening, set to default height immediately
      setIsCollapsed(false);
      setHeight(getDefaultHeight());
    } else {
      // When closing, reset height to 0
      setHeight(0);
    }
  }, [isOpen]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate delta - dragging up (decreasing clientY) increases height
    const deltaY = dragStartY.current - e.clientY;
    const maxHeight = getMaxHeight();
    const newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, dragStartHeight.current + deltaY));
    
    setHeight(newHeight);
    
    // Auto-collapse if dragged too low
    if (newHeight <= MIN_HEIGHT + 30) {
      setIsCollapsed(true);
      setHeight(MIN_HEIGHT);
    } else {
      setIsCollapsed(false);
    }
  };

  // Update MAX_HEIGHT when window resizes
  useEffect(() => {
    const handleResize = () => {
      // MAX_HEIGHT is now window.innerHeight, which is already correct
      // But we need to ensure height doesn't exceed it
      setHeight((prev) => Math.min(prev, window.innerHeight));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleToggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setHeight(getDefaultHeight());
    } else {
      setIsCollapsed(true);
      setHeight(MIN_HEIGHT);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  const methodColors: Record<string, string> = {
    'GET': '#16a34a',
    'POST': '#2563eb',
    'PUT': '#f97316',
    'PATCH': '#8b5cf6',
    'DELETE': '#dc2626',
    'HEAD': '#6b7280',
    'OPTIONS': '#6b7280'
  };

  return (
    <>
      {/* Backdrop */}
      <StyledBackdrop
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          backdropFilter: isOpen ? 'blur(2px)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(2px)' : 'blur(0px)'
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <StyledDrawer
        ref={drawerRef}
        style={{
          height: isCollapsed ? `${MIN_HEIGHT}px` : (isOpen ? `${getDefaultHeight()}px` : `${height}px`),
          maxHeight: `${getMaxHeight()}px`,
          boxShadow: isOpen ? '0 -4px 20px rgba(0, 0, 0, 0.15)' : '0 0 0 rgba(0, 0, 0, 0)'
        }}
      >
        {/* Drag Bar */}
        <StyledDragBar onMouseDown={handleDragStart}>
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'var(--border-color)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-color)';
            }}
          />
          <div style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={handleToggleCollapse}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {isCollapsed ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                  Expand
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  Collapse
                </>
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </StyledDragBar>

        {/* Drawer Content */}
        {!isCollapsed && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* Sidebar */}
            <div
              style={{
                width: 'var(--sidebar-width)',
                minWidth: 'var(--sidebar-width)',
                borderRight: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <Sidebar
                collection={hydratedCollection}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
                onToggleFolder={toggleFolder}
              />
            </div>

            {/* Main Playground Content */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              backgroundColor: '#ffffff',
              minHeight: 0
            }}>
              {selectedItem && collection ? (
                <Playground
                  item={selectedItem}
                  collection={collection}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#6c757d',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p>Select an endpoint from the sidebar to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </StyledDrawer>
    </>
  );
};

export default PlaygroundDrawer;

