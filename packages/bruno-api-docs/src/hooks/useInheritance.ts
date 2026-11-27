import { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import {
  authHeaderName,
  collectionSource,
  getInheritedConfig,
  resolveInheritedAuth,
  type InheritedAuth
} from '@/utils/request';
import { getRequestAuth, getRequestHeaders, type SupportedRequestItem } from '@/utils/schemaHelpers';

export const useInheritance = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: SupportedRequestItem
) => {
  const resolvedAuth = useMemo(
    () => resolveInheritedAuth(collection, ancestry, item as Item),
    [collection, ancestry, item]
  );
  const effectiveAuth = resolvedAuth.auth;
  const inheritedAuth = useMemo<InheritedAuth | null>(
    () =>
      getRequestAuth(item) === 'inherit'
        ? { auth: resolvedAuth.auth, source: resolvedAuth.source ?? collectionSource(collection) }
        : null,
    [item, resolvedAuth, collection]
  );

  const inheritedConfig = useMemo(() => getInheritedConfig(collection, ancestry, item), [collection, ancestry, item]);
  const { headers: inheritedHeaders, preVars: inheritedPreVars, postVars: inheritedPostVars } = inheritedConfig;

  const effectiveHeaders = useMemo<HttpRequestHeader[]>(() => {
    const authHeader = authHeaderName(effectiveAuth)?.toLowerCase();
    const keep = (header: { name?: string }) => !authHeader || (header.name || '').toLowerCase() !== authHeader;
    const ownRows = getRequestHeaders(item).filter(keep);
    const inheritedRows = inheritedHeaders
      .filter(keep)
      .map((header) => ({ name: header.name, value: header.value ?? '' }));
    return [...ownRows, ...inheritedRows];
  }, [item, inheritedHeaders, effectiveAuth]);

  return useMemo(
    () => ({
      resolvedAuth,
      effectiveAuth,
      inheritedAuth,
      inheritedHeaders,
      inheritedPreVars,
      inheritedPostVars,
      effectiveHeaders
    }),
    [
      resolvedAuth,
      effectiveAuth,
      inheritedAuth,
      inheritedHeaders,
      inheritedPreVars,
      inheritedPostVars,
      effectiveHeaders
    ]
  );
};
