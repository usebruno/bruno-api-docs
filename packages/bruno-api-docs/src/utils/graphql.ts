import type { HttpRequestBody } from '@opencollection/types/requests/http';
import { BODY_TYPES } from '@/constants';

export const buildGraphqlSnippetBody = (query: string, variables: string): HttpRequestBody | undefined => {
  const trimmedQuery = (query ?? '').trim();
  if (!trimmedQuery) return undefined;

  const fields = [`"query":${JSON.stringify(trimmedQuery)}`];
  const trimmedVariables = (variables ?? '').trim();
  if (trimmedVariables) {
    fields.push(`"variables":${trimmedVariables}`);
  }

  return { type: BODY_TYPES.JSON, data: `{${fields.join(',')}}` } as HttpRequestBody;
};
