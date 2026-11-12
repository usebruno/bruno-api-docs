import React, { useCallback, useMemo, useRef } from 'react';
import type { Item } from '@opencollection/types/collection/item';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectHydratedCollection,
  updateCollectionSettings,
  updatePlaygroundItem,
  updatePlaygroundScriptFile,
  updateFolderInCollection,
  setPlaygroundVariable,
  applyScriptVariableChanges,
  setPlaygroundResponse,
  clearPlaygroundResponse,
  setPlaygroundRequestStarted,
  clearPlaygroundRequestStarted
} from '@/store/slices/playground';
import type { WorkspaceActions } from '@/session/workspace';
import { isFolderCollapsed } from '@/session/playgroundFolders';
import { useSession } from '@/session/session';
import { useObservable } from '@/observable/observable';
import { useElementWidth, useResizableSidebar, useClickOutside } from '@/hooks';
import PlaygroundSidebar from '../PlaygroundSidebar/PlaygroundSidebar';
import type { DockMode } from '@/utils/playgroundDock';
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
}

const PlaygroundBody: React.FC<PlaygroundBodyProps> = ({
  requestSlug,
  exampleSlug,
  sidebarOpen,
  dock,
  onCloseSidebar,
  onOpenSidebar,
  appliedSlugRef
}) => {
  const collection = useAppSelector(selectHydratedCollection);
  const dispatch = useAppDispatch();
  const actions = useMemo<WorkspaceActions>(() => ({
    replaceCollection: (next) => dispatch(updateCollectionSettings(next)),
    updateRequestItem: (payload) => dispatch(updatePlaygroundItem(payload)),
    updateScriptFile: (payload) => dispatch(updatePlaygroundScriptFile(payload)),
    updateFolder: (payload) => dispatch(updateFolderInCollection(payload)),
    setVariable: (write) => dispatch(setPlaygroundVariable(write)),
    applyScriptVariableChanges: (changes) => dispatch(applyScriptVariableChanges(changes)),
    setResponse: (payload) => dispatch(setPlaygroundResponse(payload)),
    clearResponse: (uuid) => dispatch(clearPlaygroundResponse(uuid)),
    startRequest: (payload) => dispatch(setPlaygroundRequestStarted(payload)),
    finishRequest: (uuid) => dispatch(clearPlaygroundRequestStarted(uuid))
  }), [dispatch]);
  const { orientation: orientationState, folders } = useSession().playground;
  const orientationOverride = useObservable(orientationState);
  const folderState = useObservable(folders);
  const isCollapsed = useCallback((folder: Item) => isFolderCollapsed(folderState, folder), [folderState]);

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
              onToggleFolder={folders.toggle}
              onExpandFolder={(uuid) => folders.expand([uuid])}
              isFolderCollapsed={isCollapsed}
              onOpenEnvironments={selection.openEnvironments}
              environmentsActive={selection.viewMode === 'environments'}
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
          actions={actions}
        />
      </div>
    </StyledWrapper>
  );
};

export default PlaygroundBody;
