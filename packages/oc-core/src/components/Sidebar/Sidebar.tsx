import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, Folder } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import Method from '../Docs/Method/Method';
import { getItemId, generateSafeId } from '../../utils/itemUtils';
import OpenCollectionLogo from '../../assets/opencollection-logo.svg';
import { SidebarContainer, SidebarItems, SidebarItem } from './StyledWrapper';

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  description?: string;
}

interface ApiCollection {
  name: string;
  description?: string;
  version?: string;
  endpoints: ApiEndpoint[];
}

export interface SidebarProps {
  collection: OpenCollectionCollection | ApiCollection | null;
  activeItemId: string | null;
  onSelectItem: (id: string, parentPath?: string) => void;
  logo?: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  isCompact?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  collection,
  activeItemId,
  onSelectItem,
  logo,
  className = '',
  theme = 'light',
  isCompact = false
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!collection) return;
    
    const initExpandedFolders: Record<string, boolean> = {};
    
    if ('items' in collection) {
      const items = collection.items || [];
      items.forEach((item: any) => {
        if (item.type === 'folder') {
          const itemId = getItemId(item);
          initExpandedFolders[itemId] = false;
        }
      });
    }
    
    setExpandedFolders(initExpandedFolders);
  }, [collection]);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  }, []);

  const handleMouseEnter = useCallback((itemId: string) => {
    setHoveredItemId(itemId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItemId(null);
  }, []);

  const handleItemSelect = (id: string, parentPath: string = '') => {
    console.log('handleItemSelect', id, 'parentPath:', parentPath);
    onSelectItem(id, parentPath);
  };

  const normalizedItems = useMemo<any[]>(() => {
    if (!collection) return [];
    
    if ('endpoints' in collection) {
      return collection.endpoints.map((endpoint: ApiEndpoint, index: number) => ({
        type: 'http' as const,
        name: endpoint.path,
        method: endpoint.method,
        url: endpoint.path
      }));
    } else if ('items' in collection) {
      return collection.items as any[];
    }
    
    return [];
  }, [collection]);

  const filteredItems = useMemo(() => {
    return normalizedItems as OpenCollectionItem[];
  }, [normalizedItems]);

  const filteredEndpoints = useMemo(() => {
    if (!collection || !('endpoints' in collection) || !collection.endpoints) {
      return [];
    }
    
    return collection.endpoints;
  }, [collection]);

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

  const renderItem = (item: any, level = 0, parentPath = '') => {
    const itemId = getItemId(item);
    const itemName = itemId;
    const itemPath = parentPath ? `${parentPath}/${itemName}` : itemName;
    
    const fullPathId = parentPath ? `${parentPath.replace(/^\//, '')}/${itemId}` : itemId;
    
    const isFolder = item.type === 'folder';
    const safeItemId = generateSafeId(itemId);
    const isActive = !isFolder && (activeItemId === safeItemId || activeItemId === itemId);
    
    // Use fullPathId for hover state tracking
    const isHovered = hoveredItemId === fullPathId;
    const isExpanded = expandedFolders[itemId] || false;
    
    return (
      <div key={itemId} className="relative">
        <SidebarItem
          className={`
            flex items-center select-none text-sm cursor-pointer
            ${isActive ? 'active' : ''}
            ${isHovered && !isActive ? 'hovered' : ''}
            ${isFolder ? 'folder' : ''}
            transition-all duration-200
          `}
          style={{ 
            paddingLeft: `${level * 16 + 8}px`
          }}
          onClick={() => isFolder ? toggleFolder(itemId) : handleItemSelect(safeItemId, itemPath)}
          onMouseEnter={() => setHoveredItemId(fullPathId)}
          onMouseLeave={() => setHoveredItemId(null)}
          id={`sidebar-item-${fullPathId}`}
          data-item-id={fullPathId}
        >
          
          {level > 0 && (
            <div 
              className="absolute inset-y-0" 
              style={{ 
                left: `${(level - 1) * 16 + 14}px`, 
                width: '1px', 
                backgroundColor: 'var(--border-color)'
              }}
            />
          )}
          
          
          {isFolder ? (
            <div className="mr-2 flex-shrink-0">
              {renderFolderIcon(isExpanded)}
            </div>
          ) : (
            <Method 
              method={item.type === "http" ? (item as HttpRequest).method || 'GET' : 'GET'}
              className="text-xs"
            />
          )}
          
          
          <div className="truncate flex-1">
            {itemName}
          </div>
        </SidebarItem>
        
        
        {isFolder && isExpanded && (item as Folder).items && (
          <div className="relative">
            
            <div 
              className="absolute top-0 bottom-0 left-0" 
              style={{ 
                left: `${level * 16 + 14}px`, 
                width: '1px', 
                backgroundColor: 'var(--border-color)'
              }}
            />
            
            
            {((item as Folder).items || []).map((child: OpenCollectionItem) => renderItem(child, level + 1, itemPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarContainer className={`h-full flex flex-col ${isCompact ? 'compact' : ''} ${className}`} style={{ width: isCompact ? 'var(--sidebar-width-compact)' : 'var(--sidebar-width)' }}>
      {/* Collection name at top */}
      <div className="p-4 pt-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center">
          <h1 className="font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
            {collection?.name || 'API Collection'}
          </h1>
        </div>
      </div>
      
      <SidebarItems>
        {collection && 'items' in collection && filteredItems && filteredItems.length > 0 && (
          <>
            {filteredItems.map((item) => renderItem(item))}
          </>
        )}
        
        {collection && 'endpoints' in collection && filteredEndpoints.length > 0 && (
          <>
            {filteredEndpoints.map((endpoint: ApiEndpoint) => {
              const endpointId = endpoint.id || `endpoint-${endpoint.path}`;
              const safeEndpointId = generateSafeId(endpointId);
              const fullPathId = endpoint.path ? `${endpoint.path.replace(/^\//, '')}/${endpointId}` : endpointId;
              const isActive = activeItemId === safeEndpointId;
              const isHovered = hoveredItemId === fullPathId;
              
              return (
                <SidebarItem
                  key={endpointId}
                  as="button"
                  className={`endpoint flex items-center w-full text-left px-3 py-2 ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleItemSelect(safeEndpointId, endpoint.path)}
                  onMouseEnter={() => setHoveredItemId(fullPathId)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  id={`sidebar-item-${fullPathId}`}
                  data-item-id={fullPathId}
                >
                  <Method 
                    method={endpoint.method}
                    className="flex-shrink-0 text-xs"
                  />
                  <span className="truncate">{endpoint.path}</span>
                </SidebarItem>
              );
            })}
          </>
        )}
      </SidebarItems>
      
      {/* OpenCollection Logo */}
      <div className="p-2" style={{ borderColor: 'var(--border-color)' }}>
        <a 
          href="https://opencollection.dev" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block opacity-50 hover:opacity-70 transition-opacity"
        >
          <img 
            src={OpenCollectionLogo} 
            alt="OpenCollection" 
            className="w-full max-w-[140px] mx-auto"
            style={{ 
              filter: theme === 'dark' ? 'invert(1) grayscale(100%)' : 'grayscale(100%)'
            }}
          />
        </a>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;

