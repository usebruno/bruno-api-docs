import type { RequestHandler } from 'express';
import { createDocs, embed, type ApiDocsOptions } from '@usebruno/api-docs-core';

export { createDocs, embed };
export type { ApiDocsOptions, CollectionOptions, RendererOptions, EmbedOptions, EnvironmentsOption, TagsOption }
  from '@usebruno/api-docs-core';

/**
 * `app.use('/docs', apiDocs({ collection: './api-collection' }))`. Express decides the mount and
 * strips it before the handler sees the request, so there is no `mountPath` here.
 */
export function apiDocs(options: ApiDocsOptions): RequestHandler {
  return createDocs(options).handler();
}
