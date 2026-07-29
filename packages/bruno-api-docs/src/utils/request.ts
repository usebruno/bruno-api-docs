import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type {
  HttpRequest,
  HttpRequestBody,
  HttpRequestBodyVariant,
  FileBodyVariant,
  HttpRequestHeader,
  HttpResponseHeader
} from '@opencollection/types/requests/http';
import type { PropertyRow } from '../components/PropertyTable/PropertyTable';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable, SecretVariable, VariableValue, VariableValueType } from '@opencollection/types/common/variables';
import type { Action, ActionSetVariable } from '@opencollection/types/common/actions';
import { descriptionText, resolveDescription } from './description';
import {
  getRequestAuth,
  getItemName,
  getRequestScripts,
  scriptsArrayToObject,
  getRequestVariables,
  getHttpHeaders
} from './schemaHelpers';
import { getItemUuid } from './itemUtils';
import { isSecretVariable, unwrapVariableValue } from './variableResolution';
import { COLLECTION_ROOT_CRUMB } from './common';
import { AUTH_MODE_LABELS, BODY_CONTENT_TYPE, BODY_LANGUAGE } from '../constants';
import type {
  InheritedSource,
  ResolvedAuth,
  InheritedAuthSummary,
  BodyTableRow,
  FileBodyRow,
  BodyView,
  SelectedBody,
  ScriptLevel,
  ScriptPhase,
  ScriptFlow,
  ScriptChainStep,
  PreRequestVarRow,
  PostResponseVarRow,
  PostResponseVar,
  PostResponseRowInput,
  InheritedHeaderRow,
  InheritedPreRequestVarRow,
  InheritedPostResponseVarRow,
  InheritedConfig,
  OwnConfigKeys
} from './request.types';

export type * from './request.types';

export const humanizeAuthMode = (auth: Auth | undefined, labels: Record<string, string>): string => {
  if (!auth) return 'No Auth';
  if (auth === 'inherit') return 'Inherit';
  return labels[auth.type] || auth.type;
};

/** Identity of an inherited-config source — the single source of truth shared by the auth resolvers
 *  and the header/variable collectors, so an inherited row and the auth chip link to the same node. */
export const folderSource = (folder: Item): InheritedSource => ({
  level: 'folder',
  name: getItemName(folder) || 'Folder',
  uuid: getItemUuid(folder) || ''
});

export const collectionSource = (collection: OpenCollection | null | undefined): InheritedSource => ({
  level: 'collection',
  name: collection?.info?.name || 'Collection',
  uuid: COLLECTION_ROOT_CRUMB
});

/** Provenance label shown on inherited-config affordances (the auth chip and per-row goto links). */
export const inheritedSourceLabel = (source: InheritedSource): string =>
  `Inherited from ${source.level}: ${source.name}`;

/** Whether an inherited-source affordance can navigate: a handler exists and the source has a uuid. */
export const canNavigateToSource = (source: InheritedSource, onNavigate?: (uuid: string) => void): boolean =>
  Boolean(onNavigate && source.uuid);

const folderAuth = (folder: Item): Auth | undefined =>
  (folder as { request?: { auth?: Auth } }).request?.auth;

const isConcrete = (auth: Auth | undefined): boolean => !!auth && auth !== 'inherit';

export const resolveInheritedAuth = (
  collection: OpenCollection | null | undefined,
  ancestors: Item[],
  item: Item
): ResolvedAuth => {
  const own = getRequestAuth(item as HttpRequest) as Auth | undefined;
  if (own !== 'inherit') return { auth: own };

  // Walk ancestors leaf->root. Only an `inherit` folder is transparent; the first folder that
  // made an auth choice of its own — concrete OR an explicit No Auth (undefined) — is terminal
  // and wins. A No-Auth folder therefore blocks a parent's auth rather than being skipped past.
  // This mirrors the send path (`runner/utils/request-merger.ts` mergeAuth) and the app's
  // inherited-auth resolver, so the docs show exactly what the playground puts on the wire.
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const auth = folderAuth(ancestors[i]);
    if (auth === 'inherit') continue;
    return {
      auth: isConcrete(auth) ? auth : undefined,
      source: folderSource(ancestors[i])
    };
  }

  const collectionAuth = collection?.request?.auth as Auth | undefined;
  if (isConcrete(collectionAuth)) {
    return {
      auth: collectionAuth,
      source: collectionSource(collection)
    };
  }

  // Nothing concrete anywhere up the chain — the request effectively sends No Auth, not "Inherit".
  return { auth: undefined };
};

/**
 * Resolve the inherited-auth summary an Auth tab shows ("Auth inherited from {name}: {mode}"),
 * or null when the item doesn't inherit. Names the nearest configured parent (falling back
 * to the collection) and its effective mode, matching the desktop app.
 */
export const getInheritedAuthSummary = (
  collection: OpenCollection | null | undefined,
  ancestors: Item[],
  item: Item
): InheritedAuthSummary | null => {
  if (getRequestAuth(item as HttpRequest) !== 'inherit') return null;
  const resolved = resolveInheritedAuth(collection, ancestors, item);
  return {
    sourceName: resolved.source?.name || collection?.info?.name || 'Collection',
    modeLabel: humanizeAuthMode(resolved.auth, AUTH_MODE_LABELS)
  };
};

export const getDescription = (item: unknown): string | undefined => {
  if (!item || typeof item !== 'object') return undefined;
  return descriptionText((item as { description?: unknown }).description);
};

export const headerRows = (headers: (HttpRequestHeader | HttpResponseHeader)[]): PropertyRow[] =>
  headers.map((h) => ({
    label: h.name,
    value: h.value,
    disabled: Boolean((h as HttpRequestHeader).disabled),
    description: getDescription(h)
  }));

const typeOfVariableValue = (value: VariableValue | undefined): VariableValueType | undefined =>
  typeof value === 'object' ? value.type : undefined;

export const getVariableType = (variable?: Variable | SecretVariable): VariableValueType | undefined => {
  if (!variable) return undefined;

  if (isSecretVariable(variable)) return variable.type;

  const { value } = variable;

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    const activeVariant = value.find((variant) => variant.selected) ?? value[0];
    return typeOfVariableValue(activeVariant.value);
  }

  return typeOfVariableValue(value);
};

export const getVariableTypeLabel = (variable?: Variable | SecretVariable): string =>
  getVariableType(variable) ?? 'string';

export const bodyContentTypeLabel = (type: string): string => BODY_CONTENT_TYPE[type] || type;

export const selectBodyVariant = (
  body: HttpRequestBody | HttpRequestBodyVariant[] | undefined
): SelectedBody => {
  if (!body) return {};
  if (Array.isArray(body)) {
    if (body.length === 0) return {};
    const selected = body.find((v) => v.selected) ?? body[0];
    const variants = body.map((v) => ({ title: v.title, selected: v === selected }));
    return { body: selected.body, variants: variants.length > 1 ? variants : undefined };
  }
  return { body };
};

export const getBodyView = (
  rawBody: HttpRequestBody | HttpRequestBodyVariant[] | undefined
): BodyView => {
  const { body } = selectBodyVariant(rawBody);
  if (!body || !body.type) return { render: 'none' };

  switch (body.type) {
    case 'json':
    case 'xml':
    case 'text':
    case 'sparql': {
      const data = typeof body.data === 'string' ? body.data : '';
      if (!data.trim()) return { render: 'none' };
      return {
        render: 'code',
        language: BODY_LANGUAGE[body.type] || 'text',
        contentTypeLabel: bodyContentTypeLabel(body.type),
        code: data
      };
    }
    case 'form-urlencoded': {
      const rows: BodyTableRow[] = (body.data || [])
        .map((entry) => ({
          name: entry.name,
          value: entry.value,
          disabled: entry.disabled,
          description: getDescription(entry)
        }))
        .filter((row) => row.name || row.value);
      if (rows.length === 0) return { render: 'none' };
      return { render: 'table', variant: 'urlencoded', contentTypeLabel: bodyContentTypeLabel(body.type), rows };
    }
    case 'multipart-form': {
      const rows: BodyTableRow[] = (body.data || [])
        .map((entry) => ({
          name: entry.name,
          value: Array.isArray(entry.value) ? entry.value.join(', ') : String(entry.value ?? ''),
          partType: entry.type,
          contentType: entry.contentType,
          disabled: entry.disabled,
          description: getDescription(entry)
        }))
        .filter((row) => row.name || row.value);
      if (rows.length === 0) return { render: 'none' };
      return { render: 'table', variant: 'multipart', contentTypeLabel: bodyContentTypeLabel(body.type), rows };
    }
    case 'file': {
      const variants: FileBodyVariant[] = body.data || [];
      const files: FileBodyRow[] = variants
        .map((v) => ({ filePath: v.filePath, contentType: v.contentType, selected: v.selected, description: getDescription(v) }))
        .filter((f) => f.filePath || f.contentType);
      if (files.length === 0) return { render: 'none' };
      return { render: 'file', contentTypeLabel: bodyContentTypeLabel('file'), files };
    }
    default:
      return { render: 'none' };
  }
};

interface ConfigExtension {
  scripts?: { flow?: unknown };
}

export const getScriptFlow = (collection: OpenCollection | null | undefined): ScriptFlow => {
  const ext = collection?.extensions?.config as ConfigExtension | undefined;
  const flow = ext?.scripts?.flow ?? (collection?.config as ConfigExtension | undefined)?.scripts?.flow;
  return flow === 'sequential' ? 'sequential' : 'sandwich';
};

interface ScriptSource {
  level: ScriptLevel;
  order: number;
  sourceName?: string;
  sourceUuid?: string;
  pre?: string;
  post?: string;
}

const folderScripts = (folder: Item): Scripts | undefined =>
  (folder as { request?: { scripts?: Scripts } }).request?.scripts;

const stepLabel = (level: ScriptLevel, phase: ScriptPhase): string => {
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
  return `${levelLabel} ${phase === 'before-request' ? 'Pre-Request' : 'Post-Response'}`;
};

export const buildScriptChain = (
  collection: OpenCollection | null | undefined,
  ancestors: Item[],
  item: HttpRequest
): ScriptChainStep[] => {
  const collectionScripts = scriptsArrayToObject(collection?.request?.scripts);
  const sources: ScriptSource[] = [
    { level: 'collection', order: 0, sourceName: collection?.info?.name, sourceUuid: COLLECTION_ROOT_CRUMB, pre: collectionScripts.preRequest, post: collectionScripts.postResponse }
  ];
  ancestors.forEach((folder) => {
    const s = scriptsArrayToObject(folderScripts(folder));
    sources.push({ level: 'folder', order: sources.length, sourceName: getItemName(folder), sourceUuid: getItemUuid(folder), pre: s.preRequest, post: s.postResponse });
  });
  const requestScripts = scriptsArrayToObject(getRequestScripts(item));
  sources.push({ level: 'request', order: sources.length, pre: requestScripts.preRequest, post: requestScripts.postResponse });

  const steps: ScriptChainStep[] = [];

  sources.forEach((source) => {
    if (source.pre && source.pre.trim()) {
      steps.push({
        level: source.level,
        phase: 'before-request',
        label: stepLabel(source.level, 'before-request'),
        sourceName: source.sourceName,
        sourceUuid: source.sourceUuid,
        code: source.pre,
        order: source.order
      });
    }
  });

  [...sources].reverse().forEach((source) => {
    if (source.post && source.post.trim()) {
      steps.push({
        level: source.level,
        phase: 'after-response',
        label: stepLabel(source.level, 'after-response'),
        sourceName: source.sourceName,
        sourceUuid: source.sourceUuid,
        code: source.post,
        order: source.order
      });
    }
  });

  return steps;
};

// Shared row-builders. Request items keep vars/actions under `runtime`; collection
// and folder defaults keep them under `request` — but both map to the same rows.
const toPreRequestVarRow = (variable: Variable): PreRequestVarRow => ({
  name: variable.name,
  value: unwrapVariableValue(variable.value),
  type: getVariableTypeLabel(variable),
  description: getDescription(variable),
  disabled: variable.disabled
});

export const isAfterResponseSetVariable = (action: Action): action is ActionSetVariable =>
  action.type === 'set-variable' && (action.phase ?? 'after-response') === 'after-response';

const toPostResponseVarRow = (action: Action): PostResponseVarRow => ({
  name: action.variable.name,
  expression: action.selector.expression,
  scope: action.variable.scope,
  description: getDescription(action),
  disabled: action.disabled
});

export const getPreRequestVars = (item: HttpRequest): PreRequestVarRow[] =>
  getRequestVariables(item).map(toPreRequestVarRow);

export const getPostResponseVars = (item: HttpRequest): PostResponseVarRow[] =>
  (item.runtime?.actions ?? []).filter(isAfterResponseSetVariable).map(toPostResponseVarRow);

// Bridge the OC actions model (after-response set-variable) to the editable Variables rows, and back.
export const actionsToPostResponseVars = (actions: Action[] = []): PostResponseVar[] =>
  actions.filter(isAfterResponseSetVariable).map((action) => ({
    name: action.variable?.name,
    expr: action.selector?.expression,
    disabled: action.disabled,
    scope: action.variable?.scope,
    description: action.description
  }));

export const postResponseVarsToActions = (rows: PostResponseRowInput[], actions: Action[] = []): Action[] => {
  const others = actions.filter((action) => !isAfterResponseSetVariable(action));
  const postActions: ActionSetVariable[] = rows.map((row) => {
    const description = resolveDescription(row.description);
    return {
      type: 'set-variable',
      phase: 'after-response',
      selector: { expression: row.value ?? '', method: 'jsonq' },
      variable: { name: row.name ?? '', scope: row.scope || 'runtime' },
      disabled: !row.enabled,
      ...(description !== undefined ? { description } : {})
    };
  });
  return [...others, ...postActions];
};

type RequestDefaultsHolder =
  | { request?: { variables?: Variable[]; actions?: Action[] } }
  | null
  | undefined;

export const getRequestDefaultsVars = (
  node: RequestDefaultsHolder
): { preVars: PreRequestVarRow[]; postVars: PostResponseVarRow[] } => {
  const request = node?.request ?? {};

  const preVars = (request.variables ?? [])
    .filter((v): v is Variable => Boolean(v && v.name))
    .map(toPreRequestVarRow);

  const postVars = (request.actions ?? [])
    .filter((a) => isAfterResponseSetVariable(a) && Boolean(a.variable?.name))
    .map(toPostResponseVarRow);

  return { preVars, postVars };
};

export const getCollectionVariables = (
  collection: OpenCollection | null | undefined
): { preVars: PreRequestVarRow[]; postVars: PostResponseVarRow[] } => getRequestDefaultsVars(collection);

export const inheritedCountLabel = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'} inherited`;

type InheritanceNode = { request?: { headers?: HttpRequestHeader[]; variables?: Variable[]; actions?: Action[] } };

const inheritanceLevels = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[]
): { source: InheritedSource; node: InheritanceNode }[] => {
  const levels: { source: InheritedSource; node: InheritanceNode }[] = [];
  if (collection) levels.push({ source: collectionSource(collection), node: collection as InheritanceNode });
  ancestry.forEach((folder) =>
    levels.push({ source: folderSource(folder), node: folder as unknown as InheritanceNode })
  );
  return levels;
};

export const enabledHeaderKeys = (headers: { name?: string; disabled?: boolean }[]): Set<string> =>
  new Set(headers.filter((h) => h.name && !h.disabled).map((h) => (h.name as string).toLowerCase()));

export const enabledVarKeys = (vars: { name?: string; disabled?: boolean }[]): Set<string> =>
  new Set(vars.filter((v) => v.name && !v.disabled).map((v) => v.name as string));

/**
 * Walk collection -> ancestor folders ONCE and collect everything an item inherits: headers,
 * pre-request vars and post-response captures. Nearest source wins (Map last-write over the
 * shallowest-first level order), the item's own ENABLED keys are excluded, and disabled entries are
 * dropped on both sides — so the result is exactly the effective request the send path produces, and
 * the headers table, variables panel and code snippet all agree on it.
 */
export const collectInheritedConfig = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  own: OwnConfigKeys
): InheritedConfig => {
  const headers = new Map<string, InheritedHeaderRow>();
  const preVars = new Map<string, InheritedPreRequestVarRow>();
  const postVars = new Map<string, InheritedPostResponseVarRow>();

  inheritanceLevels(collection, ancestry).forEach(({ source, node }) => {
    (node?.request?.headers ?? []).forEach((h) => {
      const key = (h.name || '').toLowerCase();
      if (!key || h.disabled || own.headers.has(key)) return;
      headers.set(key, { name: h.name, value: h.value, disabled: h.disabled, description: getDescription(h), source });
    });

    const { preVars: nodePre, postVars: nodePost } = getRequestDefaultsVars(node);
    nodePre.forEach((v) => {
      if (!v.name || v.disabled || own.preVars.has(v.name)) return;
      preVars.set(v.name, { ...v, source });
    });
    nodePost.forEach((v) => {
      if (!v.name || v.disabled || own.postVars.has(v.name)) return;
      postVars.set(v.name, { ...v, source });
    });
  });

  return {
    headers: Array.from(headers.values()),
    preVars: Array.from(preVars.values()),
    postVars: Array.from(postVars.values())
  };
};

/** The full config a request inherits from its collection/folder ancestry — one ancestry walk shared
 *  by the headers table, the variables panel and the code snippet (nearest parent wins; the request's
 *  own enabled config overrides it; disabled entries are dropped). */
export const getInheritedConfig = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: HttpRequest
): InheritedConfig =>
  collectInheritedConfig(collection, ancestry, {
    headers: enabledHeaderKeys(getHttpHeaders(item)),
    preVars: enabledVarKeys(getPreRequestVars(item)),
    postVars: enabledVarKeys(getPostResponseVars(item))
  });

/** Headers the request inherits (nearest parent wins, case-insensitive, disabled dropped). */
export const getInheritedHeaders = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: HttpRequest
): InheritedHeaderRow[] => getInheritedConfig(collection, ancestry, item).headers;

/** Pre-request variables the request inherits (nearest parent wins), excluding any it defines. */
export const getInheritedPreRequestVars = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: HttpRequest
): InheritedPreRequestVarRow[] => getInheritedConfig(collection, ancestry, item).preVars;

/** Post-response captures the request inherits (nearest parent wins), excluding any it defines. */
export const getInheritedPostResponseVars = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: HttpRequest
): InheritedPostResponseVarRow[] => getInheritedConfig(collection, ancestry, item).postVars;

/**
 * Short, uppercased method name matching the design (DELETE -> DEL, OPTIONS ->
 * OPT); every other method is shown as-is. Single source for the method badges
 * and filter chips so the abbreviations can't drift between components.
 */
export const getShortMethod = (method: string): string => {
  const m = method.toUpperCase();
  if (m === 'DELETE') return 'DEL';
  if (m === 'OPTIONS') return 'OPT';
  return m;
};
