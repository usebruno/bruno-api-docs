import React, { useMemo, useState } from 'react';
import type { Folder } from '@opencollection/types/collection/item';
import type { OpenCollection } from '@opencollection/types';
import Tabs from '../../../../../ui/Tabs/Tabs';
import TitleLabel from '../../../../TitleLabel/TitleLabel';
import { type KeyValueRow } from '../../../../../components/KeyValueTable/KeyValueTable';
import { rowToVariable } from '../../../../../utils/variableDataType';
import { keyValueRowToEntry } from '../../../../../utils/keyValueRow';
import HeadersTab from '../Common/HeadersTab/HeadersTab';
import VariablesTab from '../Common/VariablesTab/VariablesTab';
import AuthTab from '../Common/AuthTab/AuthTab';
import ScriptsTab from '../Common/ScriptsTab/ScriptsTab';
import { useAppDispatch } from '../../../../../store/hooks';
import { updateFolderInCollection } from '@slices/playground';
import {
  countEnabled,
  getItemDocs,
  getItemName,
  scriptsArrayToObject,
  scriptsObjectToArray
} from '../../../../../utils/schemaHelpers';
import { getAncestorsByUuid } from '../../../../../utils/fileUtils';
import { getItemUuid } from '../../../../../utils/itemUtils';
import { getInheritedAuthSummary } from '../../../../../utils/request';
import TestsTab from '../Common/TestsTab/TestsTab';
import OverviewTab from '../Common/OverviewTab/OverviewTab';

interface FolderSettingsProps {
  folder: Folder;
  collection: OpenCollection;
  onFolderChange: (updatedFolder: Folder) => void;
}

const FolderSettings: React.FC<FolderSettingsProps> = ({ folder, collection, onFolderChange }) => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('overview');

  // The folder's own auth may itself be `inherit` — resolve the nearest configured parent so the
  // Auth tab can show "Auth inherited from {name}: {mode}" (matches the request Auth tab).
  const inheritedAuth = useMemo(() => {
    if (folder.request?.auth !== 'inherit') return null;
    const uuid = getItemUuid(folder);
    const ancestry = uuid ? getAncestorsByUuid(collection, uuid) : [];
    return getInheritedAuthSummary(collection, ancestry, folder);
  }, [folder, collection]);

  // Every edit rebuilds the folder and persists it the same way: push it into the collection (by the
  // hydrated uuid) and bubble it up. Centralised so the handlers below stay one-liners.
  const commitFolder = (updatedFolder: Folder) => {
    const uuid = (updatedFolder as Folder & { uuid?: string }).uuid;
    if (uuid) {
      dispatch(updateFolderInCollection({ uuid, folder: updatedFolder }));
    }
    onFolderChange(updatedFolder);
  };

  const handleHeadersChange = (headers: KeyValueRow[]) => {
    commitFolder({ ...folder, request: { ...folder.request, headers: headers.map(keyValueRowToEntry) } });
  };

  const handleVariablesChange = (variables: KeyValueRow[]) => {
    commitFolder({ ...folder, request: { ...folder.request, variables: variables.map(rowToVariable) } });
  };

  const handleScriptChange = (scriptType: 'preRequest' | 'postResponse' | 'tests', value: string) => {
    const updatedScriptsObj = { ...scriptsArrayToObject(folder.request?.scripts), [scriptType]: value };
    commitFolder({
      ...folder,
      request: { ...folder.request, scripts: scriptsObjectToArray(updatedScriptsObj) }
    } as Folder);
  };

  const handleAuthChange = (authType: string) => {
    let auth: any = 'inherit';
    if (authType !== 'none' && authType !== 'inherit') {
      auth = { type: authType };
    } else if (authType === 'none') {
      auth = undefined;
    }
    commitFolder({ ...folder, request: { ...folder.request, auth } });
  };

  const renderOverview = () => (
    <OverviewTab
      docs={getItemDocs(folder)}
      emptyStateSubheading="This folder has no docs. Add one in Bruno to introduce your API to readers: what it does, who it's for, and how to authenticate."
    />
  );

  const renderHeaders = () => (
    <HeadersTab
      headers={folder.request?.headers || []}
      onHeadersChange={handleHeadersChange}
      description="Request headers that will be sent with every request inside this folder."
    />
  );

  const renderVariables = () => (
    <VariablesTab
      variables={folder.request?.variables || []}
      onVariablesChange={handleVariablesChange}
      description="Variables available to every request inside this folder."
    />
  );

  const renderAuth = () => (
    <AuthTab
      auth={folder.request?.auth}
      onAuthChange={handleAuthChange}
      onItemChange={commitFolder}
      item={folder}
      description="Configures authentication for this folder. This applies to all requests using the Inherit option in the Auth tab."
      showInherit={true}
      showFullAuth={true}
      inheritedAuth={inheritedAuth}
    />
  );

  const scripts = scriptsArrayToObject(folder.request?.scripts);

  const renderScripts = () => (
    <ScriptsTab
      scripts={scripts}
      onScriptChange={handleScriptChange}
      description="Pre and post-request scripts that will run before and after any request inside this folder is sent."
      showTests={false}
    />
  );

  const renderTests = () => (
    <TestsTab
      scripts={scripts}
      onScriptChange={handleScriptChange}
      description="These tests will run any time a request in this folder is sent."
    />
  );

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: renderOverview()
    },
    {
      id: 'headers',
      label: 'Headers',
      contentIndicator: countEnabled(folder.request?.headers),
      content: renderHeaders()
    },
    {
      id: 'scripts',
      label: 'Scripts',
      content: renderScripts()
    },
    {
      id: 'tests',
      label: 'Tests',
      content: renderTests()
    },
    {
      id: 'variables',
      label: 'Vars',
      contentIndicator: countEnabled(folder.request?.variables),
      content: renderVariables()
    },
    {
      id: 'auth',
      label: 'Auth',
      content: renderAuth()
    }
  ];

  return (
    <div className="h-full flex flex-col px-5 mt-5">
      <TitleLabel className="mb-2">{getItemName(folder) || 'Folder Settings'}</TitleLabel>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs variant="responsive" testId="folder-settings-tabs" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default FolderSettings;
