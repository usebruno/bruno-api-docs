import React, { useCallback, useLayoutEffect, useRef } from 'react';
import type { Item } from '@opencollection/types/collection/item';
import { useDocument } from '@usebruno/api-shared/document/document';
import { isFolderCollapsed } from '../../../state/playgroundFolders';
import { usePlayground } from '../../../state/playground';
import { useObservable } from '@usebruno/api-shared/observable/observable';
import { useElementWidth, useResizableSidebar, useClickOutside, VariableResolverProvider } from '@usebruno/api-shared/hooks';
import PlaygroundSidebar from '../PlaygroundSidebar/PlaygroundSidebar';
import { usePlaygroundSearch } from '../../../hooks/usePlaygroundSearch';
import type { DockMode } from '@usebruno/api-shared/utils/playgroundDock';
import { usePlaygroundSelection } from './usePlaygroundSelection';
import PlaygroundViewSwitch from './PlaygroundViewSwitch';
import { StyledWrapper } from './StyledWrapper';

const ORIENTATION_BREAKPOINT = 640;

interface PlaygroundBodyProps {
  requestSlug: string | null;
  exampleSlug: string | null;
  sidebarOpen: boolean;
  dock: DockMode;
  onCloseSidebar: () => void;
  onOpenSidebar: () => void;
  // Tracks the applied request (+example) key across dock-switch remounts; owned
  // by Playground so it survives a dock switch but resets on close (see there).
  appliedSlugRef: React.MutableRefObject<string | null>;
  configureCount: number;
}

const SeededPlaygroundBody: React.FC<PlaygroundBodyProps> = ({
  requestSlug,
  exampleSlug,
  sidebarOpen,
  dock,
  onCloseSidebar,
  onOpenSidebar,
  appliedSlugRef,
  configureCount
}) => {
  const { orientation: orientationState, folders, workspace } = usePlayground();
  const collection = useObservable(workspace, (state) => state.collection);
  const orientationOverride = useObservable(orientationState);
  const folderState = useObservable(folders);
  const isCollapsed = useCallback((folder: Item) => isFolderCollapsed(folderState, folder), [folderState]);
  const search = usePlaygroundSearch(collection, folders.toggle, (uuid) => folders.expand([uuid]), isCollapsed);

  const viewRef = useRef<HTMLDivElement>(null);
  const viewWidth = useElementWidth(viewRef);
  const { width: sidebarWidth, dragging: sidebarDragging, startDrag: startSidebarResize }
    = useResizableSidebar('oc-docs:playgroundSidebarWidth', onCloseSidebar, onOpenSidebar);
  const orientation = orientationOverride ?? (viewWidth > 0 && viewWidth < ORIENTATION_BREAKPOINT ? 'vertical' : 'horizontal');

  const sidebarRef = useRef<HTMLElement>(null);
  useClickOutside(
    sidebarRef,
    onCloseSidebar,
    sidebarOpen && dock === 'inline',
    '[data-testid="playground-sidebar-toggle"], [data-testid="playground-sidebar-resizer"], [data-tippy-root]'
  );

  const selection = usePlaygroundSelection({
    requestSlug,
    exampleSlug,
    collection,
    appliedSlugRef,
    onSelected: () => {
      if (dock === 'inline') onCloseSidebar();
    }
  });

  return (
    <VariableResolverProvider collection={collection}>
      <StyledWrapper
        data-testid="playground-runner"
        data-overlay-sidebar={dock === 'inline' ? 'true' : undefined}
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {sidebarOpen && dock === 'inline' && (
          <div
            className="sidebar-backdrop"
            data-testid="playground-sidebar-backdrop"
            aria-hidden="true"
            onClick={onCloseSidebar}
          />
        )}
        {sidebarOpen && (
          <>
            <aside className="sidebar" data-testid="playground-sidebar-panel" ref={sidebarRef}>
              <PlaygroundSidebar
                collection={collection}
                activeSlug={selection.activeSlug}
                uuidToSlug={selection.uuidToSlug}
                onNavigate={selection.navigate}
                search={search}
                onOpenCollection={selection.openCollection}
                collectionActive={selection.viewMode === 'collection-settings'}
                activeExample={selection.activeExample}
                onExampleClick={selection.selectExample}
              />
            </aside>
            <div
              className="sidebar-resizer"
              data-testid="playground-sidebar-resizer"
              data-dragging={sidebarDragging ? 'true' : undefined}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              onPointerDown={startSidebarResize}
            />
          </>
        )}
        <div className="view" data-testid="playground-view" ref={viewRef}>
          <PlaygroundViewSwitch
            viewMode={selection.viewMode}
            selectedItem={selection.selectedItem}
            selectedExampleIndex={selection.selectedExampleIndex}
            collection={collection}
            dock={dock}
            orientation={orientation}
            configureCount={configureCount}
          />
        </div>
      </StyledWrapper>
    </VariableResolverProvider>
  );
};

const PlaygroundBody: React.FC<PlaygroundBodyProps> = (props) => {
  const document = useDocument();
  const { seededFrom, sync } = usePlayground();
  useLayoutEffect(() => sync(document), [sync, document]);
  const seeded = useObservable(seededFrom) === document;
  return seeded ? <SeededPlaygroundBody {...props} /> : null;
};

export default PlaygroundBody;
