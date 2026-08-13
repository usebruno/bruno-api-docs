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
  isGraphQLRequest,
  isPlaygroundUnsupported,
  pickSelectedVariant,
  getGrpcMessages,
  getGrpcMethod,
  getGrpcMethodType,
  getGrpcMetadata,
  getGrpcProtoFileName,
  type RequestItem
} from './schemaHelpers';

const item = (data: Record<string, unknown>): OpenCollectionItem => data as unknown as OpenCollectionItem;

const requestItem = (data: Record<string, unknown>): RequestItem => data as unknown as RequestItem;

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

describe('isGraphQLRequest', () => {
  it('is true only for graphql items', () => {
    expect(isGraphQLRequest({ info: { type: 'graphql' } } as unknown as OpenCollectionItem)).toBe(true);
    expect(isGraphQLRequest({ info: { type: 'http' } } as unknown as OpenCollectionItem)).toBe(false);
    expect(isGraphQLRequest(null)).toBe(false);
  });
});

describe('isPlaygroundUnsupported', () => {
  it('is true for graphql, grpc and websocket (they cannot run in the interactive playground)', () => {
    expect(isPlaygroundUnsupported({ info: { type: 'graphql' } } as unknown as OpenCollectionItem)).toBe(true);
    expect(isPlaygroundUnsupported({ info: { type: 'grpc' } } as unknown as OpenCollectionItem)).toBe(true);
    expect(isPlaygroundUnsupported({ info: { type: 'websocket' } } as unknown as OpenCollectionItem)).toBe(true);
  });

  it('is false for http requests and non-request items', () => {
    expect(isPlaygroundUnsupported({ info: { type: 'http' } } as unknown as OpenCollectionItem)).toBe(false);
    expect(isPlaygroundUnsupported({ info: { type: 'folder' } } as unknown as OpenCollectionItem)).toBe(false);
    expect(isPlaygroundUnsupported(null)).toBe(false);
  });
});

describe('pickSelectedVariant', () => {
  type Variant = { title: string; selected?: boolean };
  it('returns the selected variant, otherwise the first, otherwise undefined', () => {
    const withSelected: Variant[] = [{ title: 'A' }, { title: 'B', selected: true }];
    const noneSelected: Variant[] = [{ title: 'A' }, { title: 'B' }];
    expect(pickSelectedVariant(withSelected)).toEqual({ title: 'B', selected: true });
    expect(pickSelectedVariant(noneSelected)).toEqual({ title: 'A' });
    expect(pickSelectedVariant<Variant>([])).toBeUndefined();
  });
});

describe('getGrpcMethod', () => {
  it('reads the method from the grpc block', () => {
    expect(getGrpcMethod(item({ grpc: { method: '/hello.HelloService/SayHello' } }))).toBe(
      '/hello.HelloService/SayHello'
    );
  });

  it('returns an empty string when there is no method or no grpc block', () => {
    expect(getGrpcMethod(item({ grpc: {} }))).toBe('');
    expect(getGrpcMethod(item({ type: 'grpc', url: 'grpc://localhost:50051' }))).toBe('');
    expect(getGrpcMethod(null)).toBe('');
  });
});

describe('getGrpcMethodType', () => {
  it('reads the method type from the grpc block', () => {
    expect(getGrpcMethodType(item({ grpc: { methodType: 'bidi-streaming' } }))).toBe('bidi-streaming');
  });

  it('returns undefined when the method type is absent', () => {
    expect(getGrpcMethodType(item({ grpc: {} }))).toBeUndefined();
    expect(getGrpcMethodType(item({ type: 'grpc' }))).toBeUndefined();
  });
});

describe('getGrpcMetadata', () => {
  it('reads metadata rows, keeping descriptions and disabled flags', () => {
    expect(
      getGrpcMetadata(
        item({
          grpc: {
            metadata: [
              { name: 'authorization', value: 'Bearer t', description: 'Auth token' },
              { name: 'x-legacy', value: 'off', disabled: true }
            ]
          }
        })
      )
    ).toEqual([
      { name: 'authorization', value: 'Bearer t', description: 'Auth token' },
      { name: 'x-legacy', value: 'off', disabled: true }
    ]);
  });

  it('returns an empty list when there is no metadata', () => {
    expect(getGrpcMetadata(item({ grpc: {} }))).toEqual([]);
    expect(getGrpcMetadata(item({ type: 'grpc' }))).toEqual([]);
  });
});

describe('getGrpcMessages', () => {
  it('wraps a single stored string as one numbered message', () => {
    expect(getGrpcMessages(item({ grpc: { message: '{"a":1}' } }))).toEqual([
      { title: 'Message 1', message: '{"a":1}' }
    ]);
  });

  it('reads a one-item list identically to a stored string', () => {
    expect(getGrpcMessages(item({ grpc: { message: [{ title: 'message 1', message: '{"a":1}' }] } }))).toEqual([
      { title: 'message 1', message: '{"a":1}' }
    ]);
  });

  it('keeps the order of a streaming message list', () => {
    expect(
      getGrpcMessages(
        item({
          grpc: {
            message: [
              { title: 'message 1', message: '{"greeting":"sortitus"}' },
              { title: 'message 2', message: '{"greeting":"porro"}' }
            ]
          }
        })
      )
    ).toEqual([
      { title: 'message 1', message: '{"greeting":"sortitus"}' },
      { title: 'message 2', message: '{"greeting":"porro"}' }
    ]);
  });

  it('numbers entries that have no title, using the stored position', () => {
    expect(getGrpcMessages(item({ grpc: { message: [{ message: 'a' }, { title: '', message: 'b' }] } }))).toEqual([
      { title: 'Message 1', message: 'a' },
      { title: 'Message 2', message: 'b' }
    ]);
  });

  it('drops blank messages but keeps the numbering of the ones that remain', () => {
    expect(getGrpcMessages(item({ grpc: { message: '   ' } }))).toEqual([]);
    expect(getGrpcMessages(item({ grpc: { message: [{ message: '' }, { message: 'b' }] } }))).toEqual([
      { title: 'Message 2', message: 'b' }
    ]);
  });

  it('returns an empty list when there is no message or no grpc block', () => {
    expect(getGrpcMessages(item({ grpc: {} }))).toEqual([]);
    expect(getGrpcMessages(item({ type: 'grpc' }))).toEqual([]);
    expect(getGrpcMessages(null)).toEqual([]);
  });
});

describe('getGrpcProtoFileName', () => {
  it('returns just the file name from a stored path', () => {
    expect(getGrpcProtoFileName(item({ grpc: { protoFilePath: 'protos/hello.proto' } }))).toBe('hello.proto');
  });

  it('handles a path that climbs out of the collection folder', () => {
    expect(getGrpcProtoFileName(item({ grpc: { protoFilePath: '../../Downloads/book.proto' } }))).toBe('book.proto');
  });

  it('handles a windows-style path', () => {
    expect(getGrpcProtoFileName(item({ grpc: { protoFilePath: 'protos\\book.proto' } }))).toBe('book.proto');
  });

  it('returns undefined when no proto file is attached', () => {
    expect(getGrpcProtoFileName(item({ grpc: {} }))).toBeUndefined();
    expect(getGrpcProtoFileName(item({ type: 'grpc' }))).toBeUndefined();
  });
});
