import React, { useEffect, useMemo, useRef } from 'react';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Folder, ScriptFile } from '@opencollection/types/collection/item';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectHydratedCollection,
  selectResponsePaneOrientation,
  toggleFolderCollapse,
  expandFolders
} from '@/store/slices/playground';
import { useEnvState, useSession } from '@/session/session';
import { useObservable } from '@/observable/observable';
import type { ExampleHighlight } from '../../Docs/Sidebar/SidebarTree/SidebarTree';
import { useNavModel } from '@/routing/hooks';
import { usePlaygroundUrlState, useElementWidth, useResizableSidebar, useClickOutside } from '@/hooks';
import { getItemUuid, findItemByUuid } from '@/utils/itemUtils';
import { isFolder, isScriptFile } from '@/utils/schemaHelpers';
import { exampleIndexForSlug, exampleSlugForIndex } from '@/routing/slug';
import PlaygroundView from '../Content/Views/PlaygroundView/PlaygroundView';
import FolderSettingsView from '../Content/Views/FolderSettingsView/FolderSettingsView';
import EnvironmentsView from '../Content/Views/EnvironmentsView/EnvironmentsView';
import CollectionSettingsView from '../Content/Views/CollectionSettingsView/CollectionSettingsView';
import ExampleView from '../Content/Views/ExampleView/ExampleView';
import ScriptFileView from '../Content/Views/ScriptFileView/ScriptFileView';
import PlaygroundSidebar from '../PlaygroundSidebar/PlaygroundSidebar';
import type { DockMode } from '@/utils/playgroundDock';
import {
  resolvePlaygroundTarget,
  PLAYGROUND_ENVIRONMENTS_SLUG,
  PLAYGROUND_COLLECTION_SLUG
} from './resolvePlaygroundTarget';
import { StyledWrapper } from './StyledWrapper';
import { selectedUuid, type PlaygroundSelection } from '@/session/playground';

const ORIENTATION_BREAKPOINT = 640;

const applyKey = (requestSlug: string | null, exampleSlug: string | null): string =>
  exampleSlug ? `${requestSlug} ${exampleSlug}` : requestSlug ?? '';

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
  const dispatch = useAppDispatch();
  const model = useNavModel();
  const { setRequestSlug, setRequestExample } = usePlaygroundUrlState();
  const collection = useAppSelector(selectHydratedCollection);
  const { selection: selectionState } = useSession().playground;
  const selection = useObservable(selectionState);
  const selectedItemId = selectedUuid(selection);
  const selectedExampleIndex = typeof selection === 'object' && selection ? selection.exampleIndex : null;
  const { activeEnvName } = useEnvState();
  const orientationOverride = useAppSelector(selectResponsePaneOrientation);

  const uuidToSlug = model.slugByUuid;

  const selectedItem = useMemo(
    () => findItemByUuid(collection?.items, selectedItemId),
    [collection, selectedItemId]
  );

  const viewMode = typeof selection === 'string'
    ? selection
    : selectedExampleIndex != null
      ? 'example'
      : selectedItem && isFolder(selectedItem) ? 'folder-settings' : 'playground';

  const activeSlug = viewMode !== 'example' && selectedItemId ? uuidToSlug.get(selectedItemId) ?? '' : '';

  const exampleCount
    = selectedItem && !isFolder(selectedItem) ? ((selectedItem as HttpRequest).examples?.length ?? 0) : 0;
  const activeExample: ExampleHighlight | null
    = viewMode === 'example'
      && selectedItemId != null
      && selectedExampleIndex != null
      && selectedExampleIndex < exampleCount
      ? { requestUuid: selectedItemId, index: selectedExampleIndex }
      : null;

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

  // Reopen whatever the URL says was last open. `pgReq` holds a request, a
  // folder, or the environments / collection-settings view, so a deep link, a
  // Try, or a reload all bring back the same thing. Runs once per URL value.
  useEffect(() => {
    const key = applyKey(requestSlug, exampleSlug);
    if (!requestSlug || appliedSlugRef.current === key) return;
    const target = resolvePlaygroundTarget(requestSlug, model);
    if (!target) return;
    if (target.uuid && !collection?.items) return;
    const item = target.uuid ? findItemByUuid(collection?.items, target.uuid) : undefined;
    const exampleIndex
      = exampleSlug && item && !isFolder(item) ? exampleIndexForSlug(item as HttpRequest, exampleSlug) : null;
    appliedSlugRef.current = key;
    selectionState.set(target.uuid ? { uuid: target.uuid, exampleIndex } : target.view as PlaygroundSelection);
    if (target.expandUuids.length) dispatch(expandFolders(target.expandUuids));
  }, [requestSlug, exampleSlug, model, collection, dispatch, appliedSlugRef, selectionState]);

  const closeSidebarIfInline = () => {
    if (dock === 'inline') onCloseSidebar();
  };

  const handleNavigate = (slug: string) => {
    const target = resolvePlaygroundTarget(slug, model);
    if (!target || !target.uuid) return;
    selectionState.set({ uuid: target.uuid, exampleIndex: null });
    if (target.expandUuids.length) dispatch(expandFolders(target.expandUuids));
    appliedSlugRef.current = slug;
    setRequestSlug(slug);
    closeSidebarIfInline();
  };

  const handleToggleFolder = (uuid: string) => dispatch(toggleFolderCollapse(uuid));
  const handleExpandFolder = (uuid: string) => dispatch(expandFolders([uuid]));

  const handleExampleClick = (requestUuid: string, index: number) => {
    selectionState.set({ uuid: requestUuid, exampleIndex: index });
    const slug = uuidToSlug.get(requestUuid);
    if (slug) {
      const item = findItemByUuid(collection?.items, requestUuid);
      const request = item && !isFolder(item) ? (item as HttpRequest) : null;
      const nextExampleSlug = exampleSlugForIndex(request, index);
      appliedSlugRef.current = applyKey(slug, nextExampleSlug);
      setRequestExample(slug, nextExampleSlug);
    }
    closeSidebarIfInline();
  };

  const openEnvironments = () => {
    selectionState.set('environments');
    appliedSlugRef.current = PLAYGROUND_ENVIRONMENTS_SLUG;
    setRequestSlug(PLAYGROUND_ENVIRONMENTS_SLUG); // persist so a reload restores it
    closeSidebarIfInline();
  };

  const openCollection = () => {
    selectionState.set('collection-settings');
    appliedSlugRef.current = PLAYGROUND_COLLECTION_SLUG;
    setRequestSlug(PLAYGROUND_COLLECTION_SLUG); // persist so a reload restores it
    closeSidebarIfInline();
  };

  const view = (() => {
    if (viewMode === 'collection-settings' && collection) return <CollectionSettingsView collection={collection} />;
    if (viewMode === 'environments' && collection) return <EnvironmentsView collection={collection} compact={dock === 'inline'} />;
    if (viewMode === 'folder-settings' && selectedItem && isFolder(selectedItem) && collection) {
      return (
        <FolderSettingsView folder={selectedItem as Folder} collection={collection} onFolderChange={() => undefined} />
      );
    }
    if (
      viewMode === 'example'
      && selectedItem
      && !isFolder(selectedItem)
      && selectedExampleIndex != null
    ) {
      const example = ((selectedItem as HttpRequest).examples ?? [])[selectedExampleIndex];
      if (example) {
        return <ExampleView request={selectedItem as HttpRequest} example={example} orientation={orientation} />;
      }
    }
    if (viewMode === 'playground' && selectedItem && isScriptFile(selectedItem)) {
      return <ScriptFileView key={getItemUuid(selectedItem)} item={selectedItem as ScriptFile} />;
    }
    if ((viewMode === 'playground' || viewMode === 'example') && selectedItem && !isFolder(selectedItem) && collection) {
      return (
        <PlaygroundView
          item={selectedItem as HttpRequest}
          collection={collection}
          selectedEnvironment={activeEnvName ?? ''}
          orientation={orientation}
        />
      );
    }
    return <div className="prompt">Select an endpoint from the sidebar to get started.</div>;
  })();

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
              activeSlug={activeSlug}
              uuidToSlug={uuidToSlug}
              onNavigate={handleNavigate}
              onToggleFolder={handleToggleFolder}
              onExpandFolder={handleExpandFolder}
              onOpenEnvironments={openEnvironments}
              environmentsActive={viewMode === 'environments'}
              onOpenCollection={openCollection}
              collectionActive={viewMode === 'collection-settings'}
              activeExample={activeExample}
              onExampleClick={handleExampleClick}
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
        {view}
      </div>
    </StyledWrapper>
  );
};

export default PlaygroundBody;
