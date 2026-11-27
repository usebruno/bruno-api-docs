import { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Folder, Item } from '@opencollection/types/collection/item';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import {
  authHeaderName,
  getInheritedAuth,
  getInheritedConfig,
  getRequestOwnConfig,
  resolveInheritedAuth,
  type OwnConfig
} from '@/utils/request';
import type { SupportedRequestItem } from '@/utils/schemaHelpers';

/**
 * Auth and config an item inherits from its ancestry. `own` is the item's own headers and
 * variables; it defaults to a request's, so a folder (which keeps them under `request`) passes its own.
 */
export const useInheritance = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: SupportedRequestItem | Folder,
  own?: OwnConfig
) => {
  const resolvedAuth = useMemo(
    () => resolveInheritedAuth(collection, ancestry, item as Item),
    [collection, ancestry, item]
  );
  const effectiveAuth = resolvedAuth.auth;
  const inheritedAuth = useMemo(
    () => getInheritedAuth(collection, ancestry, item as Item),
    [collection, ancestry, item]
  );

  const ownConfig = useMemo(() => own ?? getRequestOwnConfig(item as SupportedRequestItem), [own, item]);
  const inheritedConfig = useMemo(
    () => getInheritedConfig(collection, ancestry, item as SupportedRequestItem, ownConfig),
    [collection, ancestry, item, ownConfig]
  );
  const { headers: inheritedHeaders, preVars: inheritedPreVars, postVars: inheritedPostVars } = inheritedConfig;

  const effectiveHeaders = useMemo<HttpRequestHeader[]>(() => {
    const authHeader = authHeaderName(effectiveAuth)?.toLowerCase();
    const keep = (header: { name?: string }) => !authHeader || (header.name || '').toLowerCase() !== authHeader;
    const ownRows = ownConfig.headers.filter(keep);
    const inheritedRows = inheritedHeaders
      .filter(keep)
      .map((header) => ({ name: header.name, value: header.value ?? '' }));
    return [...ownRows, ...inheritedRows];
  }, [ownConfig, inheritedHeaders, effectiveAuth]);

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
