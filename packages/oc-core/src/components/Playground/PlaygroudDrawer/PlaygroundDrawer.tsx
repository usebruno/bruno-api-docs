import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, HttpRequest, Folder } from '@opencollection/types';
import { RequestRunner } from '../../../ui/request-runner';
import { getItemId, generateSafeId } from '../../../utils/itemUtils';
import Method from '../../Method/Method';
import { StyledBackdrop, StyledDrawer, StyledDragBar } from './StyledWrapper';

interface PlaygroundDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  collection: OpenCollectionCollection | null;
  selectedItem: HttpRequest | null;
  onSelectItem: (item: HttpRequest) => void;
  proxyUrl?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const MIN_HEIGHT = 300;

const getMaxHeight = () => window.innerHeight;
const getDefaultHeight = () => window.innerHeight * 0.9;

const PlaygroundDrawer: React.FC<PlaygroundDrawerProps> = ({
  isOpen,
  onClose,
  collection,
  selectedItem,
  onSelectItem,
  proxyUrl,
  theme = 'light'
}) => {
  const [height, setHeight] = useState(() => isOpen ? getDefaultHeight() : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  // Initialize expanded folders
  useEffect(() => {
    if (!collection?.items) return;
    
    const initExpandedFolders: Record<string, boolean> = {};
    
    const traverseItems = (items: OpenCollectionItem[]) => {
      items.forEach((item) => {
        if (item.type === 'folder') {
          const itemId = getItemId(item);
          initExpandedFolders[itemId] = false;
          if ('items' in item && item.items) {
            traverseItems(item.items);
          }
        }
      });
    };
    
    traverseItems(collection.items);
    setExpandedFolders(initExpandedFolders);
  }, [collection]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  }, []);

  const renderFolderIcon = (isExpanded: boolean) => (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="transform transition-transform duration-300"
      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
    >
      <path 
        d="M9 6L15 12L9 18" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  const renderItem = (item: OpenCollectionItem, level = 0) => {
    const itemId = getItemId(item);
    const safeItemId = generateSafeId(itemId);
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders[itemId] || false;
    const isSelected = !isFolder && selectedItem && getItemId(selectedItem) === itemId;

    if (isFolder) {
      const folder = item as Folder;
      return (
        <div key={itemId}>
          <div
            onClick={() => toggleFolder(itemId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              paddingLeft: `${level * 16 + 12}px`,
              cursor: 'pointer',
              borderRadius: '6px',
              marginBottom: '2px',
              color: '#212529',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px' }}>
                {renderFolderIcon(isExpanded)}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ 
                fontSize: '13px',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {itemId}
              </span>
            </div>
          </div>
          {isExpanded && folder.items && (
            <div>
              {folder.items.map((child) => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else if (item.type === 'http') {
      const httpItem = item as HttpRequest;
      return (
        <div
          key={safeItemId}
          onClick={() => onSelectItem(httpItem)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            paddingLeft: `${level * 16 + 12}px`,
            cursor: 'pointer',
            borderRadius: '6px',
            marginBottom: '2px',
            backgroundColor: isSelected ? '#0d6efd' : 'transparent',
            color: isSelected ? 'white' : '#212529',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Method 
            method={httpItem.method || 'GET'}
            className="text-xs"
          />
          <span style={{ 
            fontSize: '13px',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {httpItem.name || itemId}
          </span>
        </div>
      );
    }
    return null;
  };

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
                width: '250px',
                minWidth: '250px',
                borderRight: '1px solid var(--border-color)',
                backgroundColor: '#f8f9fa',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '16px 0',
                flexShrink: 0
              }}
            >
              <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Playground
                </h3>
              </div>
              
              <div style={{ padding: '0 8px' }}>
                {collection?.items && collection.items.map((item) => renderItem(item))}
              </div>
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
                <RequestRunner
                  item={selectedItem}
                  collection={collection}
                  proxyUrl={proxyUrl}
                  toggleRunnerMode={onClose}
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

