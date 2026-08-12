import { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import { useMarkdownRenderer } from './useMarkdownRenderer';
import {
  getItemName,
  getRequestUrl,
  getRequestHeaders,
  getRequestParams,
  getRequestAuth,
  getItemDocs,
  getItemDescription,
  type SupportedRequestItem
} from '@/utils/schemaHelpers';
import {
  resolveInheritedAuth,
  getPreRequestVars,
  getPostResponseVars,
  getInheritedConfig,
  buildScriptChain,
  getScriptFlow,
  headerRows
} from '@/utils/request';
import { collectAssertions } from '@/utils/assertions';
import { collectTests, collectRawTestScripts } from '@/utils/fileUtils';
import { resolvePathAndQueryParams } from '@/utils/pathParams';
import { buildBreadcrumbSegments } from '@/utils/common';
import { inheritedHeaderRows } from '@/components/PropertyTable/inheritedRows';
import type { BreadcrumbSegment } from '@/ui/Breadcrumb/Breadcrumb';

export const useRequestPageData = (
  collection: OpenCollection | null | undefined,
  ancestry: Item[],
  item: SupportedRequestItem
) => {
  const md = useMarkdownRenderer();

  const name = getItemName(item) || 'Untitled Request';
  const url = getRequestUrl(item);
  const headers = getRequestHeaders(item);
  const params = getRequestParams(item);

  const { path: pathParams, query: queryParams } = useMemo(
    () => resolvePathAndQueryParams(params, url),
    [params, url]
  );

  const descHtml = useMemo(() => {
    const content = getItemDocs(item) || getItemDescription(item);
    return content ? md.render(content) : '';
  }, [item, md]);

  const ownAuth = getRequestAuth(item) as Auth | undefined;
  const resolved = useMemo(() => resolveInheritedAuth(collection, ancestry, item), [collection, ancestry, item]);
  const effectiveAuth = ownAuth === 'inherit' ? resolved.auth : ownAuth;
  const showAuth = ownAuth !== undefined;
  const authSource = ownAuth === 'inherit' ? resolved.source : undefined;

  const preVars = useMemo(() => getPreRequestVars(item), [item]);
  const postVars = useMemo(() => getPostResponseVars(item), [item]);
  const inherited = useMemo(() => getInheritedConfig(collection, ancestry, item), [collection, ancestry, item]);
  const { headers: inheritedHeaders, preVars: inheritedPreVars, postVars: inheritedPostVars } = inherited;

  const scriptChain = useMemo(() => buildScriptChain(collection, ancestry, item), [collection, ancestry, item]);
  const scriptFlow = useMemo(() => getScriptFlow(collection), [collection]);
  const assertions = useMemo(() => collectAssertions(item), [item]);
  const tests = useMemo(
    () => collectTests(collection, ancestry, item, scriptFlow),
    [collection, ancestry, item, scriptFlow]
  );
  const testScripts = useMemo(
    () => collectRawTestScripts(collection, ancestry, item, scriptFlow),
    [collection, ancestry, item, scriptFlow]
  );

  const segments = useMemo<BreadcrumbSegment[]>(
    () => buildBreadcrumbSegments(collection, ancestry),
    [collection, ancestry]
  );

  const effectiveHeaders = useMemo<HttpRequestHeader[]>(() => {
    const authIsConcrete = Boolean(effectiveAuth) && effectiveAuth !== 'inherit';
    const inheritedRows = inheritedHeaders
      .filter((h) => !(authIsConcrete && (h.name || '').toLowerCase() === 'authorization'))
      .map((h) => ({ name: h.name, value: h.value ?? '', disabled: h.disabled }));
    return [...headers, ...inheritedRows];
  }, [headers, inheritedHeaders, effectiveAuth]);

  const headerTableRows = useMemo(
    () => [...headerRows(headers), ...inheritedHeaderRows(inheritedHeaders)],
    [headers, inheritedHeaders]
  );

  const hasHeaders = headers.length > 0;
  const hasInheritedHeaders = inheritedHeaders.length > 0;
  const hasParams = pathParams.length > 0 || queryParams.length > 0;
  const hasVars
    = preVars.length > 0 || postVars.length > 0 || inheritedPreVars.length > 0 || inheritedPostVars.length > 0;
  const hasExecutionContext = scriptChain.length > 0 || hasVars || assertions.length > 0 || tests.length > 0;

  return {
    name,
    url,
    descHtml,
    pathParams,
    queryParams,
    ownAuth,
    effectiveAuth,
    showAuth,
    authSource,
    preVars,
    postVars,
    inheritedHeaders,
    inheritedPreVars,
    inheritedPostVars,
    scriptChain,
    scriptFlow,
    assertions,
    tests,
    testScripts,
    segments,
    effectiveHeaders,
    headerTableRows,
    hasHeaders,
    hasInheritedHeaders,
    hasParams,
    hasExecutionContext
  };
};

export type RequestPageData = ReturnType<typeof useRequestPageData>;
