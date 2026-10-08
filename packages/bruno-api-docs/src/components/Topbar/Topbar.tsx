import React, { useCallback, useEffect, useState } from 'react';
import { StyledWrapper } from './StyledWrapper';
import Brand from './Brand/Brand';
import OpenInBrunoButton from '../OpenInBrunoButton/OpenInBrunoButton';
import IconButton from '@/ui/IconButton/IconButton';
import { SearchIcon, HamburgerIcon } from '@/assets/icons';
import { useTopbarLayout, showsHamburger, type TopbarLayoutMode } from '@/hooks/useTopbarLayout';
import { useCanRunBrunoApp } from '@/hooks/useCanRunBrunoApp';

export interface TopbarProps {
  collectionName: string;
  version?: string;
  logo?: React.ReactNode;
  searchSlot?: React.ReactNode;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  envSwitcherSlot?: React.ReactNode;
  themeToggleSlot?: React.ReactNode;
  onOpenInBruno?: () => void;
  openInBrunoHref?: string;
  onToggleSidebar?: () => void;
  layoutMode?: TopbarLayoutMode;
  testId?: string;
}

const Topbar: React.FC<TopbarProps> = ({
  collectionName,
  version,
  logo,
  searchSlot,
  searchOpen: controlledSearchOpen,
  onSearchOpenChange,
  envSwitcherSlot,
  themeToggleSlot,
  onOpenInBruno,
  openInBrunoHref,
  onToggleSidebar,
  layoutMode,
  testId = 'topbar'
}) => {
  const autoMode = useTopbarLayout();
  const mode = layoutMode ?? autoMode;
  const canRunBrunoApp = useCanRunBrunoApp();
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const isControlled = controlledSearchOpen !== undefined;
  const searchOpen = isControlled ? controlledSearchOpen : internalSearchOpen;
  const setSearchOpen = useCallback(
    (next: boolean) => {
      if (onSearchOpenChange) onSearchOpenChange(next);
      if (!isControlled) setInternalSearchOpen(next);
    },
    [onSearchOpenChange, isControlled]
  );

  const isMobile = mode === 'mobile';
  const isDesktop = mode === 'desktop';
  const hasSearch = searchSlot != null;
  const hasSecondary = envSwitcherSlot != null;
  const hasCta = openInBrunoHref != null || onOpenInBruno != null;

  // Collapse the revealed search row when entering the desktop layout, so it
  // doesn't reappear (with stale aria state) the next time search collapses.
  useEffect(() => {
    if (isDesktop) setSearchOpen(false);
  }, [isDesktop, setSearchOpen]);

  const searchInner = <div className="topbar-search-inner">{searchSlot}</div>;

  return (
    <StyledWrapper className="topbar" data-mode={mode} data-testid={testId}>
      <div className="topbar-bar">
        {showsHamburger(mode) && (
          <IconButton className="topbar-menu" label="Toggle sidebar" onClick={onToggleSidebar} data-testid="topbar-menu">
            <HamburgerIcon />
          </IconButton>
        )}

        <Brand collectionName={collectionName} version={version} logo={logo} compact={isMobile} />

        {hasSearch && (isDesktop ? (
          <div className="topbar-search">{searchInner}</div>
        ) : (
          <>
            <div className="topbar-spacer" />
            <IconButton
              label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <SearchIcon />
            </IconButton>
          </>
        ))}

        {hasSecondary && <div className="topbar-secondary">{envSwitcherSlot}</div>}

        {themeToggleSlot}

        {canRunBrunoApp && hasCta && (
          <OpenInBrunoButton href={openInBrunoHref} onClick={onOpenInBruno} iconOnly={isMobile} />
        )}
      </div>

      {hasSearch && !isDesktop && searchOpen && (
        <div className="topbar-search-row">{searchInner}</div>
      )}
    </StyledWrapper>
  );
};

export default Topbar;
