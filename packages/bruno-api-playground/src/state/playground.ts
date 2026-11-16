import type { OpenCollection } from '@opencollection/types';
import { createObservable } from '@usebruno/api-shared/observable/observable';
import type { ResponseBodyFormat } from '@usebruno/api-shared/constants';
import { useSession } from '@usebruno/api-shared/session/session';
import { useDocument } from '@usebruno/api-shared/document/document';
import { playgroundRuns } from '@usebruno/api-shared/session/playgroundRuns';
import { createPlaygroundFolders } from './playgroundFolders';
import { createWorkspace } from './workspace';

export type PlaygroundSelection
  = | { uuid: string; exampleIndex: number | null }
    | 'environments'
    | 'collection-settings'
    | null;

const sameSelection = (a: PlaygroundSelection, b: PlaygroundSelection): boolean =>
  a === b
  || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null
    && a.uuid === b.uuid && a.exampleIndex === b.exampleIndex);

export const selectedUuid = (selection: PlaygroundSelection): string | null =>
  typeof selection === 'object' && selection !== null ? selection.uuid : null;

type ResponsePaneOrientation = 'horizontal' | 'vertical';

const createKeyed = <V>() => {
  const state = createObservable<Record<string, V>>({ initial: {} });
  return {
    get: state.get,
    subscribe: state.subscribe,
    setEntry: (key: string | null, value: V) => {
      if (key == null || state.get()[key] === value) return;
      state.set({ ...state.get(), [key]: value });
    }
  };
};

export const createPlayground = (document: OpenCollection) => {
  const selection = createObservable<PlaygroundSelection>({ initial: null });
  const folders = createPlaygroundFolders();
  const workspace = createWorkspace();
  const seededFrom = createObservable<OpenCollection | null>({ initial: null });

  const sync = (next: OpenCollection) => {
    if (next !== seededFrom.get()) {
      folders.seed(next.items);
      workspace.replaceCollection(next);
      seededFrom.set(next);
    }
    for (const uuid of Object.keys(workspace.get().requestStartedAt)) {
      if (!playgroundRuns.isSending(uuid)) workspace.finishRequest(uuid);
    }
  };
  sync(document);

  return {
    selection: {
      get: selection.get,
      subscribe: selection.subscribe,
      set: (next: PlaygroundSelection) => {
        if (!sameSelection(selection.get(), next)) selection.set(next);
      }
    },
    orientation: createObservable<ResponsePaneOrientation | null>({ initial: null }),
    responseFormat: createKeyed<ResponseBodyFormat>(),
    responsePreview: createKeyed<boolean>(),
    folders,
    workspace,
    seededFrom: { get: seededFrom.get, subscribe: seededFrom.subscribe },
    sync
  };
};

export type Playground = ReturnType<typeof createPlayground>;

export const usePlayground = (): Playground => {
  const document = useDocument();
  return useSession().slot('playground', () => createPlayground(document));
};
