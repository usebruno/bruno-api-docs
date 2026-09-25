export type DockMode = 'inline' | 'bottom' | 'modal';

export const DOCK_MODES: DockMode[] = ['inline', 'bottom', 'modal'];
export const DEFAULT_DOCK: DockMode = 'bottom';

export const PARAM_OPEN = 'pg';
export const PARAM_DOCK = 'dock';
export const PARAM_REQUEST = 'pgReq';
export const PARAM_EXAMPLE = 'pgEx';

export const isDockMode = (value: string | null | undefined): value is DockMode =>
  value === 'inline' || value === 'bottom' || value === 'modal';

export const DOCK_STORAGE_KEY = 'oc-docs:playgroundDock';
export const HEIGHT_STORAGE_KEY = 'oc-docs:playgroundBottomHeight';
export const WIDTH_STORAGE_KEY = 'oc-docs:playgroundInlineWidth';
export const COLLAPSED_STORAGE_KEY = 'oc-docs:playgroundBottomCollapsed';

export const readStoredDock = (storage: Storage | null): DockMode | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DOCK_STORAGE_KEY);
    return isDockMode(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeStoredDock = (storage: Storage | null, dock: DockMode): void => {
  if (!storage) return;
  try {
    storage.setItem(DOCK_STORAGE_KEY, dock);
  } catch {
    // storage may be full or unavailable; the URL still carries the dock
  }
};
export interface PlaygroundUrlState {
  open: boolean;
  dock: DockMode;
  requestSlug: string | null;
  exampleSlug: string | null;
}

// The URL is the source of truth for the dock (a shared link reproduces the
// sender's dock). sessionStorage remembers the last dock only as the fallback
// for a fresh open with no `dock` param (see usePlaygroundUrlState).
export const readPlaygroundParams = (params: URLSearchParams): PlaygroundUrlState => {
  const open = params.get(PARAM_OPEN) === '1';
  const dockParam = params.get(PARAM_DOCK);
  const dock = isDockMode(dockParam) ? dockParam : DEFAULT_DOCK;
  const requestSlug = params.get(PARAM_REQUEST);
  const exampleSlug = requestSlug ? params.get(PARAM_EXAMPLE) : null;
  return { open, dock, requestSlug, exampleSlug };
};

interface WriteInput {
  open: boolean;
  dock?: DockMode;
  requestSlug?: string | null;
  exampleSlug?: string | null;
}

export const writePlaygroundParams = (params: URLSearchParams, input: WriteInput): URLSearchParams => {
  const next = new URLSearchParams(params);
  if (!input.open) {
    next.delete(PARAM_OPEN);
    next.delete(PARAM_DOCK);
    next.delete(PARAM_REQUEST);
    next.delete(PARAM_EXAMPLE);
    return next;
  }
  next.set(PARAM_OPEN, '1');
  if (input.dock) next.set(PARAM_DOCK, input.dock);
  if (input.requestSlug) next.set(PARAM_REQUEST, input.requestSlug);
  else next.delete(PARAM_REQUEST);
  if (input.requestSlug && input.exampleSlug) next.set(PARAM_EXAMPLE, input.exampleSlug);
  else next.delete(PARAM_EXAMPLE);
  return next;
};
