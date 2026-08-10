import { describe, it, expect } from 'vitest';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';
import {
  getItemDescription,
  getRequestBadgeLabel,
  getRequestAuth,
  getGraphqlQuery,
  getGraphqlVariables,
  getGraphqlMethod,
  getRequestHeaders,
  getRequestParams,
  isUnsupportedRequest
} from './schemaHelpers';

const item = (data: Record<string, unknown>): OpenCollectionItem => data as unknown as OpenCollectionItem;

// getRequestAuth accepts only request items (not folders); cast fabricated shapes to its param type.
const requestItem = (data: Record<string, unknown>) => data as unknown as Parameters<typeof getRequestAuth>[0];

describe('getItemDescription', () => {
  it('reads a plain string description from the info block', () => {
    expect(getItemDescription({ info: { description: 'Short summary.' } } as any)).toBe('Short summary.');
  });

  it('reads the content of a structured description', () => {
    expect(
      getItemDescription({ info: { description: { content: 'Rich summary.', type: 'text/markdown' } } } as any)
    ).toBe('Rich summary.');
  });

  it('returns an empty string when there is no description', () => {
    expect(getItemDescription({ info: {} } as any)).toBe('');
    expect(getItemDescription({} as any)).toBe('');
    expect(getItemDescription(null)).toBe('');
    expect(getItemDescription(undefined)).toBe('');
  });
});

describe('getRequestBadgeLabel', () => {
  it('returns the HTTP method for http requests', () => {
    expect(getRequestBadgeLabel(item({ type: 'http', method: 'POST' }))).toBe('POST');
    expect(getRequestBadgeLabel(item({ type: 'http' }))).toBe('GET');
  });

  it('returns short protocol labels for non-HTTP requests', () => {
    expect(getRequestBadgeLabel(item({ type: 'graphql' }))).toBe('GQL');
    expect(getRequestBadgeLabel(item({ type: 'grpc' }))).toBe('GRPC');
    expect(getRequestBadgeLabel(item({ type: 'websocket' }))).toBe('WS');
  });

  it('returns undefined for items that carry no badge', () => {
    expect(getRequestBadgeLabel(item({ type: 'folder' }))).toBeUndefined();
    expect(getRequestBadgeLabel(item({ type: 'script' }))).toBeUndefined();
    expect(getRequestBadgeLabel(null)).toBeUndefined();
  });
});

describe('getRequestAuth', () => {
  it('lets the protocol block win over a request-block auth', () => {
    expect(
      getRequestAuth(requestItem({ http: { auth: { type: 'bearer' } }, request: { auth: { type: 'apikey' } } }))
    ).toEqual({ type: 'bearer' });
  });

  it('reads auth nested under a request block (flat-shape requests)', () => {
    expect(getRequestAuth(requestItem({ method: 'POST', request: { auth: { type: 'apikey' } } }))).toEqual({
      type: 'apikey'
    });
  });

  it('falls back to request.auth when a protocol block exists without auth', () => {
    expect(
      getRequestAuth(requestItem({ http: { body: { type: 'json' } }, request: { auth: { type: 'apikey' } } }))
    ).toEqual({ type: 'apikey' });
  });

  it('treats a cleared request-block auth as no auth', () => {
    expect(getRequestAuth(requestItem({ method: 'POST', request: { auth: undefined } }))).toBeUndefined();
  });
});

describe('GraphQL getters', () => {
  const gql = (graphql: Record<string, unknown>) =>
    ({ info: { type: 'graphql' }, graphql }) as unknown as Parameters<typeof getGraphqlQuery>[0];

  it('reads the query and variables from graphql.body', () => {
    const gqlItem = gql({ body: { query: 'query { me }', variables: '{"a":1}' } });
    expect(getGraphqlQuery(gqlItem)).toBe('query { me }');
    expect(getGraphqlVariables(gqlItem)).toBe('{"a":1}');
  });

  it('selects the chosen variant (or the first) when the body is a list of variants', () => {
    const gqlItem = gql({
      body: [
        { title: 'A', body: { query: 'query A' } },
        { title: 'B', selected: true, body: { query: 'query B', variables: '{}' } }
      ]
    });
    expect(getGraphqlQuery(gqlItem)).toBe('query B');
    expect(getGraphqlVariables(gqlItem)).toBe('{}');
  });

  it('returns empty strings when the body is missing', () => {
    expect(getGraphqlQuery(gql({}))).toBe('');
    expect(getGraphqlVariables(gql({}))).toBe('');
    expect(getGraphqlQuery(null)).toBe('');
  });

  it('defaults the method to POST', () => {
    expect(getGraphqlMethod(gql({ method: 'GET' }))).toBe('GET');
    expect(getGraphqlMethod(gql({}))).toBe('POST');
  });

  it('labels the badge GQL', () => {
    expect(getRequestBadgeLabel(gql({}))).toBe('GQL');
  });
});

describe('generalized request headers/params getters', () => {
  const req = (data: Record<string, unknown>) => data as unknown as Parameters<typeof getRequestHeaders>[0];

  it('reads headers and params from the graphql block', () => {
    const gqlItem = req({
      info: { type: 'graphql' },
      graphql: { headers: [{ name: 'x-a', value: '1' }], params: [{ name: 'p', value: 'v' }] }
    });
    expect(getRequestHeaders(gqlItem)).toEqual([{ name: 'x-a', value: '1' }]);
    expect(getRequestParams(gqlItem)).toEqual([{ name: 'p', value: 'v' }]);
  });

  it('reads headers from the http block', () => {
    const httpItem = req({ info: { type: 'http' }, http: { headers: [{ name: 'x-b', value: '2' }] } });
    expect(getRequestHeaders(httpItem)).toEqual([{ name: 'x-b', value: '2' }]);
  });

  it('returns an empty array when there is no protocol block', () => {
    expect(getRequestHeaders(req({ info: { type: 'graphql' } }))).toEqual([]);
    expect(getRequestParams(null)).toEqual([]);
  });
});

describe('isUnsupportedRequest', () => {
  it('no longer treats graphql as unsupported', () => {
    expect(isUnsupportedRequest({ info: { type: 'graphql' } } as unknown as OpenCollectionItem)).toBe(false);
  });

  it('still treats grpc and websocket as unsupported', () => {
    expect(isUnsupportedRequest({ info: { type: 'grpc' } } as unknown as OpenCollectionItem)).toBe(true);
    expect(isUnsupportedRequest({ info: { type: 'websocket' } } as unknown as OpenCollectionItem)).toBe(true);
  });
});
