import React from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Folder, Item, ScriptFile } from '@opencollection/types/collection/item';
import { useEnvState } from '@usebruno/api-shared/session/session';
import { usePlayground } from '../../../state/playground';
import { useObservable } from '@usebruno/api-shared/observable/observable';
import { getItemUuid } from '@usebruno/api-shared/utils/itemUtils';
import { isFolder, isScriptFile } from '@usebruno/api-shared/utils/schemaHelpers';
import type { DockMode } from '@usebruno/api-shared/utils/playgroundDock';
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
  configureCount: number;
}

const PlaygroundViewSwitch: React.FC<PlaygroundViewSwitchProps> = ({
  viewMode,
  selectedItem,
  selectedExampleIndex,
  collection,
  dock,
  orientation,
  configureCount
}) => {
  const { activeEnvName } = useEnvState();
  const { workspace } = usePlayground();
  const selectedItemUuid = getItemUuid(selectedItem) ?? '';
  const response = useObservable(workspace, (state) => state.responses[selectedItemUuid]);
  const requestStartedAt = useObservable(workspace, (state) => state.requestStartedAt[selectedItemUuid] ?? null);

  if (viewMode === 'collection-settings' && collection) {
    return <CollectionSettingsView collection={collection} onCollectionChange={workspace.replaceCollection} />;
  }
  if (viewMode === 'environments' && collection) {
    return (
      <EnvironmentsView
        key={configureCount}
        collection={collection}
        compact={dock === 'inline'}
        onCollectionChange={workspace.replaceCollection}
      />
    );
  }
  if (viewMode === 'folder-settings' && selectedItem && isFolder(selectedItem) && collection) {
    const onFolderChange = (folder: Folder) => {
      const uuid = getItemUuid(folder);
      if (uuid) workspace.updateFolder({ uuid, folder });
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
        onScriptChange={workspace.updateScriptFile}
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
        actions={workspace}
      />
    );
  }
  return <div className="prompt">Select an endpoint from the sidebar to get started.</div>;
};

export default PlaygroundViewSwitch;
