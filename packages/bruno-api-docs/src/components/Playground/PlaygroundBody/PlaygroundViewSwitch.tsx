import React from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Folder, Item, ScriptFile } from '@opencollection/types/collection/item';
import { useEnvState } from '@/session/session';
import type { WorkspaceActions } from '@/session/workspace';
import { useAppSelector } from '@/store/hooks';
import { selectPlaygroundResponse, selectPlaygroundRequestStartedAt } from '@/store/slices/playground';
import { getItemUuid } from '@/utils/itemUtils';
import { isFolder, isScriptFile } from '@/utils/schemaHelpers';
import type { DockMode } from '@/utils/playgroundDock';
import PlaygroundView from '../Content/Views/PlaygroundView/PlaygroundView';
import FolderSettingsView from '../Content/Views/FolderSettingsView/FolderSettingsView';
import EnvironmentsView from '../Content/Views/EnvironmentsView/EnvironmentsView';
import CollectionSettingsView from '../Content/Views/CollectionSettingsView/CollectionSettingsView';
import ExampleView from '../Content/Views/ExampleView/ExampleView';
import ScriptFileView from '../Content/Views/ScriptFileView/ScriptFileView';
import type { ViewMode } from './usePlaygroundSelection';

interface PlaygroundViewSwitchProps {
  viewMode: ViewMode;
  selectedItem: Item | null | undefined;
  selectedExampleIndex: number | null;
  collection: OpenCollection | null;
  dock: DockMode;
  orientation: 'horizontal' | 'vertical';
  actions: WorkspaceActions;
}

const PlaygroundViewSwitch: React.FC<PlaygroundViewSwitchProps> = ({
  viewMode,
  selectedItem,
  selectedExampleIndex,
  collection,
  dock,
  orientation,
  actions
}) => {
  const { activeEnvName } = useEnvState();
  const selectedItemUuid = getItemUuid(selectedItem) ?? '';
  const response = useAppSelector((state) => selectPlaygroundResponse(state, selectedItemUuid));
  const requestStartedAt = useAppSelector((state) => selectPlaygroundRequestStartedAt(state, selectedItemUuid));

  if (viewMode === 'collection-settings' && collection) {
    return <CollectionSettingsView collection={collection} onCollectionChange={actions.replaceCollection} />;
  }
  if (viewMode === 'environments' && collection) {
    return (
      <EnvironmentsView
        collection={collection}
        compact={dock === 'inline'}
        onCollectionChange={actions.replaceCollection}
      />
    );
  }
  if (viewMode === 'folder-settings' && selectedItem && isFolder(selectedItem) && collection) {
    const onFolderChange = (folder: Folder) => {
      const uuid = getItemUuid(folder);
      if (uuid) actions.updateFolder({ uuid, folder });
    };
    return (
      <FolderSettingsView folder={selectedItem as Folder} collection={collection} onFolderChange={onFolderChange} />
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
    return (
      <ScriptFileView
        key={getItemUuid(selectedItem)}
        item={selectedItem as ScriptFile}
        onScriptChange={actions.updateScriptFile}
      />
    );
  }
  if ((viewMode === 'playground' || viewMode === 'example') && selectedItem && !isFolder(selectedItem) && collection) {
    return (
      <PlaygroundView
        item={selectedItem as HttpRequest}
        collection={collection}
        selectedEnvironment={activeEnvName ?? ''}
        orientation={orientation}
        response={response}
        requestStartedAt={requestStartedAt}
        actions={actions}
      />
    );
  }
  return <div className="prompt">Select an endpoint from the sidebar to get started.</div>;
};

export default PlaygroundViewSwitch;
