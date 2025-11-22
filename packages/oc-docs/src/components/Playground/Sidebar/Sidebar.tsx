import React, { useCallback } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem, Folder } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import Method from '../../Docs/Method/Method';
import OpenCollectionLogo from '../../../assets/opencollection-logo.svg';
import { SidebarContainer, SidebarItems, SidebarItem } from './StyledWrapper';

export interface SidebarProps {
  collection: OpenCollection | null;
  selectedItemId: string | null;
  onSelectItem: (uuid: string) => void;
  onToggleFolder: (uuid: string) => void;
  onEnvironmentsClick?: () => void;
  isEnvironmentsSelected?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  collection,
  selectedItemId,
  onSelectItem,
  onToggleFolder,
  onEnvironmentsClick,
  isEnvironmentsSelected = false
}) => {
  const renderFolderIcon = useCallback((isExpanded: boolean) => (
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
  ), []);

  const renderItem = useCallback((item: OpenCollectionItem, level = 0): React.ReactNode => {
    
    const isFolder = item.type === 'folder';
    // Use UUID for active state comparison
    const isActive = !isFolder && !isEnvironmentsSelected && selectedItemId === (item as any).uuid;
    
    // Read isCollapsed from the item itself (defaults to true if not set)
    const isExpanded = isFolder ? !((item as any).isCollapsed ?? true) : false;
    
    const itemUuid = (item as any).uuid;
    
    return (
      <div key={itemUuid} className="relative">
        <SidebarItem
          className={`
            flex items-center select-none text-sm cursor-pointer
            ${isActive ? 'active' : ''}
            ${isFolder ? 'folder' : ''}
            transition-all duration-200
          `}
          style={{ 
            paddingLeft: `${level * 16 + 8}px`
          }}
          onClick={() => isFolder ? onToggleFolder(itemUuid) : onSelectItem(itemUuid)}
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
            <div className="mr-2 shrink-0">
              {renderFolderIcon(isExpanded)}
            </div>
          ) : (
            <Method 
              method={item.type === "http" ? (item as HttpRequest).method || 'GET' : 'GET'}
              className="text-xs"
            />
          )}
          
          
          <div className="truncate flex-1">
            {(item as any).name}
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
            
            {((item as Folder).items || []).map((child: OpenCollectionItem) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [isEnvironmentsSelected, selectedItemId, onToggleFolder, onSelectItem, renderFolderIcon]);

  return (
    <SidebarContainer className="h-full flex flex-col" style={{ width: 'var(--sidebar-width)' }}>
      {/* Collection name at top */}
      <div className="p-4 pb-0">
        <div className="flex items-center">
          <h1 className="font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
            {collection?.info?.name || 'API Collection'}
          </h1>
        </div>
      </div>

      <div className="p-2">
      {onEnvironmentsClick && (
          <SidebarItem
            className={`
              flex items-center select-none text-sm cursor-pointer border border-gray-200 rounded-md p-2
              ${isEnvironmentsSelected ? 'active' : ''}
              transition-all duration-200
            `}
            onClick={onEnvironmentsClick}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ marginRight: '8px', flexShrink: 0 }}
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <div className="truncate flex-1">
              Environments ({((collection as any).environments?.length || collection?.config?.environments?.length || 0)})
            </div>
          </SidebarItem>
        )}
      </div>
      
      <SidebarItems>
        {collection?.items?.length && (
          collection.items.map((item) => renderItem(item))
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
              filter: 'grayscale(100%)'
            }}
          />
        </a>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;

