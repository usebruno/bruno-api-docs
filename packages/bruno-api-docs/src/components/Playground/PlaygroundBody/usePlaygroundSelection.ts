import { useEffect, useMemo, type MutableRefObject } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { useSession } from '@/session/session';
import { useObservable } from '@/observable/observable';
import { selectedUuid, type PlaygroundSelection } from '@/session/playground';
import type { ExampleHighlight } from '../../Docs/Sidebar/SidebarTree/SidebarTree';
import { useNavModel } from '@/document/document';
import { usePlaygroundUrlState } from '@/hooks';
import { findItemByUuid } from '@/utils/itemUtils';
import { isFolder } from '@/utils/schemaHelpers';
import { exampleIndexForSlug, exampleSlugForIndex } from '@/routing/slug';
import {
  resolvePlaygroundTarget,
  PLAYGROUND_ENVIRONMENTS_SLUG,
  PLAYGROUND_COLLECTION_SLUG
} from './resolvePlaygroundTarget';

export type ViewMode = 'playground' | 'environments' | 'folder-settings' | 'collection-settings' | 'example';

const applyKey = (requestSlug: string | null, exampleSlug: string | null): string =>
  exampleSlug ? `${requestSlug} ${exampleSlug}` : requestSlug ?? '';

interface Options {
  requestSlug: string | null;
  exampleSlug: string | null;
  collection: OpenCollection | null;
  appliedSlugRef: MutableRefObject<string | null>;
  onSelected: () => void;
}

export const usePlaygroundSelection = ({
  requestSlug,
  exampleSlug,
  collection,
  appliedSlugRef,
  onSelected
}: Options) => {
  const model = useNavModel();
  const { setRequestSlug, setRequestExample } = usePlaygroundUrlState();
  const { selection: selectionState, folders } = useSession().playground;
  const selection = useObservable(selectionState);
  const selectedItemId = selectedUuid(selection);
  const selectedExampleIndex = typeof selection === 'object' && selection ? selection.exampleIndex : null;
  const uuidToSlug = model.slugByUuid;

  const selectedItem = useMemo(
    () => findItemByUuid(collection?.items, selectedItemId),
    [collection, selectedItemId]
  );

  const viewMode: ViewMode = typeof selection === 'string'
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
    folders.expand(target.expandUuids);
  }, [requestSlug, exampleSlug, model, collection, appliedSlugRef, selectionState, folders]);

  const navigate = (slug: string) => {
    const target = resolvePlaygroundTarget(slug, model);
    if (!target || !target.uuid) return;
    selectionState.set({ uuid: target.uuid, exampleIndex: null });
    folders.expand(target.expandUuids);
    appliedSlugRef.current = slug;
    setRequestSlug(slug);
    onSelected();
  };

  const selectExample = (requestUuid: string, index: number) => {
    selectionState.set({ uuid: requestUuid, exampleIndex: index });
    const slug = uuidToSlug.get(requestUuid);
    if (slug) {
      const item = findItemByUuid(collection?.items, requestUuid);
      const request = item && !isFolder(item) ? (item as HttpRequest) : null;
      const nextExampleSlug = exampleSlugForIndex(request, index);
      appliedSlugRef.current = applyKey(slug, nextExampleSlug);
      setRequestExample(slug, nextExampleSlug);
    }
    onSelected();
  };

  const openEnvironments = () => {
    selectionState.set('environments');
    appliedSlugRef.current = PLAYGROUND_ENVIRONMENTS_SLUG;
    setRequestSlug(PLAYGROUND_ENVIRONMENTS_SLUG); // persist so a reload restores it
    onSelected();
  };

  const openCollection = () => {
    selectionState.set('collection-settings');
    appliedSlugRef.current = PLAYGROUND_COLLECTION_SLUG;
    setRequestSlug(PLAYGROUND_COLLECTION_SLUG); // persist so a reload restores it
    onSelected();
  };

  return {
    viewMode,
    selectedItem,
    selectedExampleIndex,
    activeSlug,
    activeExample,
    uuidToSlug,
    navigate,
    selectExample,
    openEnvironments,
    openCollection
  };
};
