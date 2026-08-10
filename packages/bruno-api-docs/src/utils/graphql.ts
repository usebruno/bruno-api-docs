import type { HttpRequestBody } from '@opencollection/types/requests/http';
import { BODY_TYPES } from '../constants';

export const buildGraphqlSnippetBody = (query: string, variables: string): HttpRequestBody | undefined => {
  const trimmedQuery = (query ?? '').trim();
  if (!trimmedQuery) return undefined;

  const queryField = `"query":${JSON.stringify(trimmedQuery)}`;
  const trimmedVariables = (variables ?? '').trim();
  let variablesField = '';
  if (trimmedVariables) {
    try {
      variablesField = `,"variables":${JSON.stringify(JSON.parse(trimmedVariables))}`;
    } catch {
      variablesField = '';
    }
  }

  return { type: BODY_TYPES.JSON, data: `{${queryField}${variablesField}}` } as HttpRequestBody;
};
