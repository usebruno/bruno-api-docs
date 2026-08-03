import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import type { Item } from '@opencollection/types/collection/item';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectDocsCollection } from '@/store/slices/docs';
import { setPlaygroundVariable } from '@/store/slices/playground';
import { selectActiveEnvName, selectShowVars } from '@/store/slices/env';
import { getRequestVariables, isFolder } from '@/utils/schemaHelpers';
import { getItemUuid } from '@/utils/itemUtils';
import { mockDataFunctions, timeBasedDynamicVars } from '@/runner/utils/faker-functions';
import {
  buildScopedVariableModel,
  resolveVariables,
  singleReferenceName,
  detectSpecialScope,
  isValidVariableName,
  isExternalSecretActive,
  formatEntryValue,
  referencesSecret,
  type ExternalSecretEntry,
  type ScopedVariableModel,
  type VariableScope,
  type VariableSource
} from '@/utils/variableResolution';

export type DynamicVariableKind = 'random' | 'time' | 'unknown';

export interface VariableLookup {
  name: string;
  scope: VariableScope;
  value: string;
  rawValue: string;
  secret: boolean;
  valid: boolean;
  dynamicKind?: DynamicVariableKind;
  simpleString: boolean;
}

const classifyDynamic = (name: string): DynamicVariableKind => {
  const keyword = name.slice(1);
  if (!Object.prototype.hasOwnProperty.call(mockDataFunctions, keyword)) return 'unknown';
  return timeBasedDynamicVars.has(keyword) ? 'time' : 'random';
};

/**
 * Shared variable resolution hook, the contract redesigned doc sections
 * consume. It resolves `{{var}}` against the active environment (the env slice),
 * gated by the show-variables flag, with secret variables always masked.
 *
 * - showVars off → `resolve()` returns the raw string (`{{baseUrl}}`).
 * - showVars on  → `resolve()` returns the interpolated value.
 * - Secret variables never resolve to plaintext: their values are excluded from
 *   the map (so a `{{secret}}` reference is left as-is), and a value that is
 *   exactly a secret reference is reported by `secretRefName()` so the caller
 *   can mask the whole cell.
 */
export interface VariableResolver {
  showVars: boolean;
  activeEnvName: string | null;
  resolve: (raw: string) => string;
  isSecret: (name: string) => boolean;
  secretRefName: (raw: string) => string | null;
  lookup: (name: string) => VariableLookup;
  isFound: (name: string) => boolean;
  names: string[];
  canWrite: boolean;
  updateVariable: (name: string, value: string) => void;
}

const lookupVariable = (rawName: string, model: ScopedVariableModel): VariableLookup => {
  const name = (rawName ?? '').trim();
  const base = { name, value: '', rawValue: '', secret: false, simpleString: false };

  const special = detectSpecialScope(name);
  if (special === 'dynamic') return { ...base, scope: 'dynamic', valid: true, dynamicKind: classifyDynamic(name) };
  if (special) return { ...base, scope: special, valid: true };
  if (!isValidVariableName(name)) return { ...base, scope: 'undefined', valid: false };

  const entry = model.entries[name];
  if (!entry) return { ...base, scope: 'undefined', valid: true };

  const safeValue = formatEntryValue(entry, model.values);
  const secret = entry.secret || model.secretNames.has(name) || referencesSecret(safeValue, model.secretNames);
  const value = secret ? formatEntryValue(entry, model.fullValues) : safeValue;
  const { scope, value: rawValue, simpleString } = entry;
  return { name, scope, value, rawValue, secret, valid: true, simpleString };
};

const makeResolver = (
  model: ScopedVariableModel,
  showVars: boolean,
  activeEnvName: string | null
): VariableResolver => {
  const isSecret = (name: string) => model.secretNames.has(name.trim());
  return {
    showVars,
    activeEnvName,
    isSecret,
    isFound: (name: string) => Object.prototype.hasOwnProperty.call(model.entries, name),
    names: Object.keys(model.entries),
    resolve: (raw: string) => (showVars ? resolveVariables(raw, model.values) : raw),
    secretRefName: (raw: string) => {
      const name = singleReferenceName(raw);
      return name && isSecret(name) ? name : null;
    },
    lookup: (name: string) => lookupVariable(name, model),
    canWrite: false,
    updateVariable: () => {}
  };
};

/** Presents an environment's external secrets as ordinary secret variables. */
const externalSecretVariables = (environment: Environment | undefined): SecretVariable[] =>
  ((environment?.externalSecrets?.variables ?? []) as ExternalSecretEntry[])
    .filter((entry) => entry.name && isExternalSecretActive(entry))
    .map((entry) => ({ name: entry.name, secret: true, value: entry.value ?? '' }) as unknown as SecretVariable);

const collectionAndEnvSources = (
  collection: OpenCollection | null,
  activeEnvName: string | null,
  withExternalSecrets = false
): VariableSource[] => {
  const collectionVariables = (collection?.request?.variables ?? []) as (Variable | SecretVariable)[];
  const environments = (collection?.config?.environments ?? []) as Environment[];
  const activeEnvironment = environments.find((environment) => environment.name === activeEnvName);
  const sources: VariableSource[] = [{ scope: 'collection', variables: collectionVariables }];
  if (withExternalSecrets) {
    sources.push({ scope: '$secrets', variables: externalSecretVariables(activeEnvironment) });
  }
  sources.push({ scope: 'environment', variables: activeEnvironment?.variables });
  return sources;
};

const folderVariables = (folder: Item): (Variable | SecretVariable)[] =>
  ((folder as { request?: { variables?: unknown[] } }).request?.variables ?? []) as (Variable | SecretVariable)[];

const itemSource = (item: Item): VariableSource =>
  isFolder(item)
    ? { scope: 'folder', variables: folderVariables(item) }
    : { scope: 'request', variables: getRequestVariables(item as never) as (Variable | SecretVariable)[] };

export const useVariableResolver = (): VariableResolver => {
  const collection = useAppSelector(selectDocsCollection) as OpenCollection | null;
  const activeEnvName = useAppSelector(selectActiveEnvName);
  const showVars = useAppSelector(selectShowVars);

  const model = useMemo(
    () => buildScopedVariableModel(collectionAndEnvSources(collection, activeEnvName)),
    [collection, activeEnvName]
  );

  return useMemo(() => makeResolver(model, showVars, activeEnvName), [model, showVars, activeEnvName]);
};

/**
 * Passthrough resolver: show-vars off, identity resolve, empty lookup. It is the
 * context default so a `VariableText` rendered without a provider (unit tests,
 * isolated previews) simply shows raw `{{var}}` tokens (no store required) and a
 * hover card degrades to an "undefined" scope rather than throwing.
 */
const PASSTHROUGH_RESOLVER: VariableResolver = {
  showVars: false,
  activeEnvName: null,
  resolve: (raw) => raw,
  isSecret: () => false,
  secretRefName: () => null,
  lookup: (name) => ({
    name: (name ?? '').trim(),
    scope: 'undefined',
    value: '',
    rawValue: '',
    secret: false,
    valid: true,
    simpleString: false
  }),
  isFound: () => false,
  names: [],
  canWrite: false,
  updateVariable: () => {}
};

const VariableResolverContext = createContext<VariableResolver>(PASSTHROUGH_RESOLVER);

/** Consume the active resolver (falls back to passthrough with no provider). */
export const useResolvedVariables = (): VariableResolver => useContext(VariableResolverContext);

/**
 * Provides the store-backed resolver (collection + active environment) to
 * descendants. Mounted once at the app shell so every `{{var}}` render site
 * resolves against one active environment without each site subscribing to the
 * store itself.
 */
export const VariableResolverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <VariableResolverContext.Provider value={useVariableResolver()}>{children}</VariableResolverContext.Provider>
);

export const ItemVariableResolverProvider: React.FC<{
  collection: OpenCollection | null;
  ancestry: Item[];
  item: Item | null;
  writable?: boolean;
  children: React.ReactNode;
}> = ({ collection, ancestry, item, writable = false, children }) => {
  const dispatch = useAppDispatch();
  const activeEnvName = useAppSelector(selectActiveEnvName);
  const showVars = useAppSelector(selectShowVars);

  // Both the docs pages and the playground mount this provider; only the
  // playground passes `writable`, and only it can supply an external secret.
  const model = useMemo(() => {
    const sources: VariableSource[] = collectionAndEnvSources(collection, activeEnvName, writable);
    for (const folder of ancestry) {
      sources.push({ scope: 'folder', variables: folderVariables(folder) });
    }
    if (item) sources.push(itemSource(item));
    return buildScopedVariableModel(sources);
  }, [collection, activeEnvName, ancestry, item, writable]);

  const resolver = useMemo(() => makeResolver(model, showVars, activeEnvName), [model, showVars, activeEnvName]);

  const updateVariable = useCallback(
    (name: string, value: string) => {
      const { name: varName, scope } = resolver.lookup(name);
      if (scope === 'environment' || scope === '$secrets') {
        if (activeEnvName) dispatch(setPlaygroundVariable({ scope, name: varName, value, envName: activeEnvName }));
      } else if (scope === 'collection') {
        dispatch(setPlaygroundVariable({ scope, name: varName, value }));
      } else if (scope === 'request') {
        const itemUuid = getItemUuid(item);
        if (itemUuid) dispatch(setPlaygroundVariable({ scope, name: varName, value, itemUuid }));
      } else if (scope === 'folder') {
        const owner = [...ancestry].reverse().find((folder) =>
          folderVariables(folder).some((v) => v.name === varName && !v.disabled)
        );
        const itemUuid = getItemUuid(owner);
        if (itemUuid) dispatch(setPlaygroundVariable({ scope, name: varName, value, itemUuid }));
      }
    },
    [resolver, dispatch, activeEnvName, item, ancestry]
  );

  const value = useMemo(
    () => ({ ...resolver, canWrite: writable, updateVariable }),
    [resolver, writable, updateVariable]
  );

  return <VariableResolverContext.Provider value={value}>{children}</VariableResolverContext.Provider>;
};
