import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarNavLink from './SidebarNavLink/SidebarNavLink';
import SidebarTree from './SidebarTree/SidebarTree';
import { CubeIcon, GlobeIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';
import { computeAutoReveal } from './autoReveal';
import { useDocument, useNavModel } from '@/document/document';
import { normalizeSlug, resolveSlug } from '@/routing/resolve';
import { OVERVIEW_SLUG, ENVIRONMENTS_SLUG } from '@/routing/navModel';
import { useDocsNavigate, useAutoHideScrollbar, useIsMobileDevice } from '@/hooks';
import { useActiveExample } from './hooks/useActiveExample';
import type { FolderCollapse } from './hooks/useFolderCollapse';

interface SidebarProps {
  folders: FolderCollapse;
  onNavigate?: () => void;
  testId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ folders, onNavigate, testId = 'sidebar' }) => {
  const collection = useDocument();
  const model = useNavModel();
  const docsNavigate = useDocsNavigate();
  const { pathname } = useLocation();
  // Resolve to the entry slug so an example path (<request>/<example>) still
  // highlights and auto-reveals its parent request, not the raw (unmatched) path.
  const activeSlug = resolveSlug(model, pathname)?.entry.slug ?? normalizeSlug(pathname);

  const goTo = (slug: string) => {
    docsNavigate(slug);
    onNavigate?.();
  };

  const { activeExample, goToExample } = useActiveExample(model, onNavigate);

  // Show the scrollbar while the list is in use, then fade it out after 1s idle.
  // Shared with the playground sidebar so both behave the same.
  const itemsRef = useRef<HTMLDivElement>(null);
  useAutoHideScrollbar(itemsRef);

  // Smaller nav text on real phones/tablets only. Based on the device, not the
  // window size, so a narrow laptop window keeps the normal 13px.
  const isMobileDevice = useIsMobileDevice();

  const { expand } = folders;
  const autoRevealedSlug = useRef<string | null>(null);
  useEffect(() => {
    // Open the folders around the active item so it shows up in the tree. On
    // reload the collection loads a moment later, so computeAutoReveal waits
    // until it can resolve the slug; this effect runs again once it loads and
    // opens the folders then, instead of leaving them closed.
    const { claim, uuids } = computeAutoReveal(autoRevealedSlug.current, activeSlug, model);
    if (claim) autoRevealedSlug.current = activeSlug;
    if (uuids.length) expand(uuids);
  }, [activeSlug, model, expand]);

  return (
    <StyledWrapper className={`sidebar${isMobileDevice ? ' mobile' : ''}`} data-testid={testId}>
      <div className="sidebar-top-links">
        <SidebarNavLink
          label="Overview"
          icon={<CubeIcon />}
          active={activeSlug === OVERVIEW_SLUG}
          testId="sidebar-overview"
          onClick={() => goTo(OVERVIEW_SLUG)}
        />
        {/* Always shown, like Overview: with no environments the page renders
            an empty state, so the section must stay reachable from the sidebar. */}
        <SidebarNavLink
          label="Environments"
          icon={<GlobeIcon />}
          active={activeSlug === ENVIRONMENTS_SLUG}
          testId="sidebar-environments"
          onClick={() => goTo(ENVIRONMENTS_SLUG)}
        />
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-items" ref={itemsRef}>
        {collection?.items?.length ? (
          <SidebarTree
            items={collection.items}
            // While an example is highlighted, only the example row is active,
            // not its parent request row (even though we navigated to that page).
            activeSlug={activeExample ? '' : activeSlug}
            uuidToSlug={model.slugByUuid}
            onNavigate={goTo}
            onToggleFolder={folders.toggle}
            onExpandFolder={(uuid) => expand([uuid])}
            isFolderCollapsed={folders.isCollapsed}
            activeExample={activeExample}
            onExampleClick={goToExample}
          />
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Sidebar;
