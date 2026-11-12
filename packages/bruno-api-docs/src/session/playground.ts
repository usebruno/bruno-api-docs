import { createObservable } from '@/observable/observable';

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

export const createPlayground = () => {
  const selection = createObservable<PlaygroundSelection>({ initial: null });
  return {
    selection: {
      get: selection.get,
      subscribe: selection.subscribe,
      set: (next: PlaygroundSelection) => {
        if (!sameSelection(selection.get(), next)) selection.set(next);
      }
    }
  };
};
