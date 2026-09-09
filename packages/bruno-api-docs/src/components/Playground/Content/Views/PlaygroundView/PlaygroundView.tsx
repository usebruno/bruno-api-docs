import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { HttpRequest, HttpRequestHeader } from '@opencollection/types/requests/http';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { Auth } from '@opencollection/types/common/auth';
import { getAncestorsByUuid } from '@/utils/fileUtils';
import { ItemVariableResolverProvider, type VariableChange } from '@/hooks';
import TitleLabel from '@/components/TitleLabel/TitleLabel';
import QueryBar from './QueryBar/QueryBar';
import RequestPane from './RequestPane/RequestPane';
import ResponsePane from './ResponsePane/ResponsePane';
import { useAppDispatch } from '@/store/hooks';
import {
  updatePlaygroundItem,
  setPlaygroundResponse,
  selectPlaygroundResponse,
  applyScriptVariableChanges,
  setPlaygroundVariable,
  usePlaygroundSelector
} from '@/store/slices/playground';
import { getItemName, isPlaygroundUnsupported, getRequestAuth, getRequestHeaders } from '@/utils/schemaHelpers';
import { getInheritedAuthSummary, resolveInheritedAuth, getInheritedHeaders } from '@/utils/request';
import UnsupportedRequest from '@/components/UnsupportedRequest/UnsupportedRequest';
import { FileNotFoundIcon } from '@/assets/icons';
import { useSplitPane } from '@/hooks/useSplitPane';
import { SplitDivider } from '@/components/SplitDivider/SplitDivider';

interface PlaygroundViewProps {
  item: HttpRequest;
  collection: OpenCollectionCollection;
  selectedEnvironment?: string;
  orientation?: 'horizontal' | 'vertical';
}

const HttpRequestPlaygroundView: React.FC<PlaygroundViewProps> = ({ item, collection, selectedEnvironment = '', orientation = 'horizontal' }) => {
  const dispatch = useAppDispatch();
  const [editableItem, setEditableItem] = useState<HttpRequest>(item);
  const updateVariable = useCallback((change: VariableChange) => dispatch(setPlaygroundVariable(change)), [dispatch]);
  const itemName = getItemName(editableItem) || 'Untitled Request';
  const itemUuid = (item as any).uuid;
  const response = usePlaygroundSelector((state) => selectPlaygroundResponse(state, itemUuid));
  const [isLoading, setIsLoading] = useState(false);
  // The request/response split is one draggable divider whose axis follows the
  // orientation: horizontal layout resizes width, vertical layout resizes height.
  const { size: paneSize, isResizing, containerRef, startResize } = useSplitPane(orientation);
  const ancestry = useMemo(
    () => (collection && itemUuid ? getAncestorsByUuid(collection, itemUuid) : []),
    [collection, itemUuid]
  );
  const inheritedAuth = useMemo(
    () => getInheritedAuthSummary(collection, ancestry, editableItem),
    [collection, ancestry, editableItem]
  );
  // Resolve the auth so that the runner and the code snippet show the same effective auth.
  const effectiveAuth = useMemo<Auth | undefined>(() => {
    const ownAuth = getRequestAuth(editableItem) as Auth | undefined;
    return ownAuth === 'inherit' ? resolveInheritedAuth(collection, ancestry, editableItem).auth : ownAuth;
  }, [collection, ancestry, editableItem]);

  // Applies same rules as runner so that the code snippet shows the same effective headers as the runner.
  const effectiveHeaders = useMemo<HttpRequestHeader[]>(() => {
    const auth = effectiveAuth && effectiveAuth !== 'inherit' ? effectiveAuth : undefined;
    const authWritesAuthorization = Boolean(
      (auth?.type === 'bearer' && auth.token) || (auth?.type === 'basic' && auth.username && auth.password)
    );
    const keep = (header: { name?: string }) =>
      !authWritesAuthorization || (header.name || '').toLowerCase() !== 'authorization';
    const ownRows = getRequestHeaders(editableItem).filter(keep);
    const inheritedRows = getInheritedHeaders(collection, ancestry, editableItem)
      .filter(keep)
      .map((header) => ({ name: header.name, value: header.value ?? '', disabled: header.disabled }));
    return [...ownRows, ...inheritedRows];
  }, [collection, ancestry, editableItem, effectiveAuth]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ uuid: string; item: HttpRequest } | null>(null);

  useEffect(() => {
    setEditableItem(item);
    // Don't clear response anymore - it's preserved in Redux by UUID
  }, [item]);

  // Save changes to Redux with debouncing.
  const handleItemChange = useCallback((updatedItem: HttpRequest) => {
    setEditableItem(updatedItem);

    const itemUuid = (updatedItem as any).uuid || (item as any).uuid;
    if (itemUuid) pendingSaveRef.current = { uuid: itemUuid, item: { ...updatedItem, uuid: itemUuid } as any };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        dispatch(updatePlaygroundItem(pendingSaveRef.current));
        pendingSaveRef.current = null;
      }
    }, 500);
  }, [dispatch, item]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (pendingSaveRef.current) {
        dispatch(updatePlaygroundItem(pendingSaveRef.current));
        pendingSaveRef.current = null;
      }
    };
  }, [dispatch]);

  const handleSendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check both root level and config level for environments
      // TODO: Remove this
      const envs = (collection as any).environments || collection?.config?.environments || [];
      const environment = envs.find(
        (env: any) => env.name === selectedEnvironment
      );
      const { requestRunner } = await import('@/runner');
      const result = await requestRunner.runRequest({
        item: editableItem,
        collection,
        environment,
        runtimeVariables: {}
      });

      dispatch(setPlaygroundResponse({ uuid: itemUuid, response: result }));

      if (result.environmentVariables || result.collectionVariables) {
        dispatch(applyScriptVariableChanges({
          environmentVariables: result.environmentVariables,
          collectionVariables: result.collectionVariables
        }));
      }
    } catch (error) {
      dispatch(setPlaygroundResponse({
        uuid: itemUuid,
        response: {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }));
    } finally {
      setIsLoading(false);
    }
  }, [collection, editableItem, selectedEnvironment, itemUuid, dispatch]);

  return (
    <ItemVariableResolverProvider
      collection={collection}
      ancestry={ancestry}
      item={editableItem as unknown as Item}
      onUpdateVariable={updateVariable}
    >
      <div className="request-runner-container h-full flex flex-col px-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <TitleLabel className="truncate mb-2 mt-5">{itemName}</TitleLabel>

        <QueryBar
          item={editableItem}
          onSendRequest={handleSendRequest}
          isLoading={isLoading}
          onItemChange={handleItemChange}
          effectiveAuth={effectiveAuth}
          effectiveHeaders={effectiveHeaders}
        />

        <div
          ref={containerRef}
          className={`flex flex-1 overflow-hidden pt-4 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}`}
          style={{ userSelect: isResizing ? 'none' : undefined }}
        >
          <div
            className={orientation === 'vertical' ? 'shrink-0 overflow-hidden min-h-0' : 'shrink-0 overflow-hidden'}
            style={
              orientation === 'vertical'
                ? { height: `${paneSize}%` }
                : { width: `${paneSize}%`, borderColor: 'var(--border-color)' }
            }
          >
            <RequestPane item={editableItem} onItemChange={handleItemChange} inheritedAuth={inheritedAuth} />
          </div>

          <SplitDivider orientation={orientation} onPointerDown={startResize} active={isResizing} testId="playground-divider" />

          <div className="flex-1 overflow-hidden min-h-0">
            <ResponsePane response={response} isLoading={isLoading} orientation={orientation} itemUuid={itemUuid} />
          </div>
        </div>
      </div>
    </ItemVariableResolverProvider>
  );
};

const PlaygroundView: React.FC<PlaygroundViewProps> = ({ item, ...otherProps }) => {
  if (isPlaygroundUnsupported(item)) {
    return (
      <UnsupportedRequest
        className="px-5"
        item={item}
        titleVariant="label"
        showRequestDocs={false}
        emptyStateProps={{
          icon: <FileNotFoundIcon />,
          heading: 'Request type not supported',
          subheadingSuffix: 'isn\'t currently supported in this playground.'
        }}
      />
    );
  }
  return <HttpRequestPlaygroundView item={item} {...otherProps} />;
};

export default PlaygroundView;
