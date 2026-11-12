import type { OpenCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import type { Item, Folder } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { createObservable } from '@/observable/observable';
import { isFolder } from '@/utils/schemaHelpers';
import { applyScriptEnvVars } from '@/utils/environments';
import { reconcileScriptVariables } from '@/utils/scriptVariables';
import type { Variables } from '@/runner/utils/variable-interpolator';

export interface WorkspaceState {
  collection: OpenCollection | null;
  responses: Record<string, any>;
  requestStartedAt: Record<string, number>;
}

export const EMPTY_WORKSPACE: WorkspaceState = { collection: null, responses: {}, requestStartedAt: {} };

export type VariableScope = 'environment' | 'collection' | 'folder' | 'request' | '$secrets';

export interface VariableWrite {
  scope: VariableScope;
  name: string;
  value: string;
  envName?: string;
  itemUuid?: string;
}

export interface ScriptVariableChanges {
  environmentVariables?: { envName: string; variables: Variables; deleted: string[] };
  collectionVariables?: { variables: Variables; deleted: string[] };
}

type AnyItem = Item & { uuid?: string; [key: string]: any };
type VariableList = (Variable | SecretVariable)[];

const withCollection = (state: WorkspaceState, collection: OpenCollection | null): WorkspaceState =>
  collection === state.collection ? state : { ...state, collection };

const updateItemIn = (items: Item[], uuid: string, update: (item: AnyItem) => AnyItem): Item[] => {
  let found = false;
  const walk = (list: Item[]): Item[] => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i] as AnyItem;
      let next = item;
      if (item.uuid === uuid) {
        found = true;
        next = update(item);
      } else if (isFolder(item) && (item as Folder).items) {
        const children = (item as Folder).items!;
        const nested = walk(children);
        if (nested !== children) next = { ...item, items: nested } as AnyItem;
      }
      if (!found) continue;
      if (next === item) return list;
      const copy = list.slice();
      copy[i] = next;
      return copy;
    }
    return list;
  };
  return walk(items);
};

const updateItem = (state: WorkspaceState, uuid: string, update: (item: AnyItem) => AnyItem): WorkspaceState => {
  const collection = state.collection;
  if (!collection?.items) return state;
  const items = updateItemIn(collection.items, uuid, update);
  return items === collection.items ? state : { ...state, collection: { ...collection, items } };
};

type RootEnvironments = OpenCollection & { environments?: Environment[] | null };

const environmentsOf = (collection: OpenCollection): Environment[] | null =>
  (collection as RootEnvironments).environments ?? collection.config?.environments ?? null;

const updateEnvironment = (
  collection: OpenCollection,
  envName: string | undefined,
  update: (env: Environment) => Environment
): OpenCollection => {
  const environments = environmentsOf(collection);
  const index = environments?.findIndex((env) => env.name === envName) ?? -1;
  if (index < 0) return collection;
  const env = environments![index];
  const next = update(env);
  if (next === env) return collection;
  const updated = environments!.slice();
  updated[index] = next;
  if ((collection as RootEnvironments).environments != null) {
    return { ...collection, environments: updated } as RootEnvironments;
  }
  return { ...collection, config: { ...collection.config, environments: updated } };
};

const setInList = (list: VariableList | undefined, name: string, value: string): VariableList | undefined => {
  if (!list) return list;
  let index = -1;
  list.forEach((v, i) => {
    if (v.name === name && !v.disabled) index = i;
  });
  if (index < 0 || (list[index] as { value?: unknown }).value === value) return list;
  const copy = list.slice();
  copy[index] = { ...list[index], value } as Variable;
  return copy;
};

const setRequestVariable = (item: AnyItem, name: string, value: string): AnyItem => {
  if ('runtime' in item && item.runtime?.variables) {
    const variables = setInList(item.runtime.variables, name, value);
    return variables === item.runtime.variables ? item : { ...item, runtime: { ...item.runtime, variables } };
  }
  if ('variables' in item && Array.isArray(item.variables)) {
    const variables = setInList(item.variables, name, value);
    return variables === item.variables ? item : { ...item, variables };
  }
  return item;
};

const setFolderVariable = (item: AnyItem, name: string, value: string): AnyItem => {
  const variables = setInList(item.request?.variables, name, value);
  return variables === item.request?.variables ? item : { ...item, request: { ...item.request, variables } };
};

export const setCollection = (state: WorkspaceState, collection: OpenCollection | null): WorkspaceState =>
  withCollection(state, collection);

export const clearCollection = (): WorkspaceState => ({ collection: null, responses: {}, requestStartedAt: {} });

export const updateRequestItem = (
  state: WorkspaceState,
  { uuid, item }: { uuid: string; item: HttpRequest }
): WorkspaceState => updateItem(state, uuid, (old) => ({ ...item, uuid: old.uuid }) as AnyItem);

export const updateScriptFile = (
  state: WorkspaceState,
  { uuid, script }: { uuid: string; script: string }
): WorkspaceState => updateItem(state, uuid, (item) => (item.script === script ? item : { ...item, script }));

export const updateFolder = (
  state: WorkspaceState,
  { uuid, folder }: { uuid: string; folder: Folder }
): WorkspaceState =>
  updateItem(state, uuid, (item) => {
    const changed = Object.keys(folder).some(
      (key) => !(key in item) || !Object.is(item[key], (folder as AnyItem)[key])
    );
    return changed ? ({ ...item, ...folder } as AnyItem) : item;
  });

export const setVariable = (
  state: WorkspaceState,
  { scope, name, value, envName, itemUuid }: VariableWrite
): WorkspaceState => {
  const collection = state.collection;
  if (!collection) return state;
  if (scope === '$secrets') {
    return withCollection(state, updateEnvironment(collection, envName, (env) => {
      const variables = setInList(env.externalSecrets?.variables as VariableList | undefined, name, value);
      return variables === env.externalSecrets?.variables
        ? env
        : { ...env, externalSecrets: { ...env.externalSecrets!, variables: variables as any } };
    }));
  }
  if (scope === 'environment') {
    return withCollection(state, updateEnvironment(collection, envName, (env) => {
      const variables = setInList(env.variables, name, value);
      return variables === env.variables ? env : { ...env, variables };
    }));
  }
  if (scope === 'collection') {
    const variables = setInList(collection.request?.variables as VariableList | undefined, name, value);
    if (variables === collection.request?.variables) return state;
    const request = { ...collection.request, variables: variables as Variable[] };
    return withCollection(state, { ...collection, request });
  }
  if (!itemUuid) return state;
  return updateItem(state, itemUuid, (item) =>
    scope === 'folder' ? setFolderVariable(item, name, value) : setRequestVariable(item, name, value)
  );
};

export const applyScriptVariableChanges = (
  state: WorkspaceState,
  { environmentVariables, collectionVariables }: ScriptVariableChanges
): WorkspaceState => {
  let collection = state.collection;
  if (!collection) return state;
  if (environmentVariables) {
    const { envName, variables, deleted } = environmentVariables;
    collection = updateEnvironment(collection, envName, (env) => ({
      ...env,
      variables: applyScriptEnvVars(env, variables, new Set(deleted))
    }));
  }
  if (collectionVariables) {
    collection = {
      ...collection,
      request: {
        ...collection.request,
        variables: reconcileScriptVariables(
          collection.request?.variables ?? [],
          collectionVariables.variables,
          { deleted: new Set(collectionVariables.deleted) }
        ) as Variable[]
      }
    };
  }
  return withCollection(state, collection);
};

export const setResponse = (
  state: WorkspaceState,
  { uuid, response }: { uuid: string; response: any }
): WorkspaceState =>
  uuid in state.responses && state.responses[uuid] === response
    ? state
    : { ...state, responses: { ...state.responses, [uuid]: response } };

const without = <V>(record: Record<string, V>, key: string): Record<string, V> => {
  const { [key]: _removed, ...rest } = record;
  return rest;
};

export const clearResponse = (state: WorkspaceState, uuid: string): WorkspaceState =>
  uuid in state.responses ? { ...state, responses: without(state.responses, uuid) } : state;

export const startRequest = (
  state: WorkspaceState,
  { uuid, startedAt }: { uuid: string; startedAt: number }
): WorkspaceState =>
  uuid in state.requestStartedAt && state.requestStartedAt[uuid] === startedAt
    ? state
    : { ...state, requestStartedAt: { ...state.requestStartedAt, [uuid]: startedAt } };

export const finishRequest = (state: WorkspaceState, uuid: string): WorkspaceState =>
  uuid in state.requestStartedAt ? { ...state, requestStartedAt: without(state.requestStartedAt, uuid) } : state;

export const clearAllRequests = (state: WorkspaceState): WorkspaceState => ({ ...state, requestStartedAt: {} });

export interface WorkspaceActions {
  replaceCollection: (collection: OpenCollection) => void;
  updateRequestItem: (payload: { uuid: string; item: HttpRequest }) => void;
  updateScriptFile: (payload: { uuid: string; script: string }) => void;
  updateFolder: (payload: { uuid: string; folder: Folder }) => void;
  setVariable: (write: VariableWrite) => void;
  applyScriptVariableChanges: (changes: ScriptVariableChanges) => void;
  setResponse: (payload: { uuid: string; response: any }) => void;
  clearResponse: (uuid: string) => void;
  startRequest: (payload: { uuid: string; startedAt: number }) => void;
  finishRequest: (uuid: string) => void;
}

export const createWorkspace = () => {
  const state = createObservable<WorkspaceState>({ initial: EMPTY_WORKSPACE });
  const apply = <P>(update: (current: WorkspaceState, payload: P) => WorkspaceState) =>
    (payload: P) => state.set(update(state.get(), payload));
  const actions: WorkspaceActions = {
    replaceCollection: apply(setCollection),
    updateRequestItem: apply(updateRequestItem),
    updateScriptFile: apply(updateScriptFile),
    updateFolder: apply(updateFolder),
    setVariable: apply(setVariable),
    applyScriptVariableChanges: apply(applyScriptVariableChanges),
    setResponse: apply(setResponse),
    clearResponse: apply(clearResponse),
    startRequest: apply(startRequest),
    finishRequest: apply(finishRequest)
  };
  return {
    get: state.get,
    subscribe: state.subscribe,
    seed: apply(setCollection),
    clear: () => state.set(clearCollection()),
    clearAllRequests: () => state.set(clearAllRequests(state.get())),
    ...actions
  };
};

export type Workspace = ReturnType<typeof createWorkspace>;
