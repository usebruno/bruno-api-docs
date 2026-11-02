import type { RequestHandler } from 'express';
import { createDocs, embed, type ApiDocsOptions } from '@usebruno/api-docs-core';

export { createDocs, embed };
export type { ApiDocsOptions, CollectionOptions, CollectionFilters, Filter, RendererOptions, EmbedOptions }
  from '@usebruno/api-docs-core';

export function apiDocs(options: ApiDocsOptions): RequestHandler {
  return createDocs(options).handler();
}
