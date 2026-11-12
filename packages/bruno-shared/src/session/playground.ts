import { createObservable } from '../observable/observable';
import type { ResponseBodyFormat } from '../constants';
import { createPlaygroundFolders } from './playgroundFolders';

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

export const createPlayground = () => {
  const selection = createObservable<PlaygroundSelection>({ initial: null });
  return {
    selection: {
      get: selection.get,
      subscribe: selection.subscribe,
      set: (next: PlaygroundSelection) => {
        if (!sameSelection(selection.get(), next)) selection.set(next);
      },
      clearRequest: () => {
        if (selectedUuid(selection.get()) !== null) selection.set(null);
      }
    },
    orientation: createObservable<ResponsePaneOrientation | null>({ initial: null }),
    responseFormat: createKeyed<ResponseBodyFormat>(),
    responsePreview: createKeyed<boolean>(),
    folders: createPlaygroundFolders()
  };
};
