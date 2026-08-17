import React from 'react';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { GraphQLRequest } from '@opencollection/types/requests/graphql';
import type { Item } from '@opencollection/types/collection/item';
import { MemoryRouter } from 'react-router-dom';
import { GraphqlRequest } from './GraphqlRequest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';

const collection: OpenCollection = {
  info: { name: 'Country API', version: '1.0.0' },
  request: {
    headers: [{ name: 'x-collection', value: 'collection-value' }]
  }
};

const ancestry: Item[] = [
  { uuid: 'folder-1', info: { name: 'Authentication', type: 'folder' } } as unknown as Item
];

const graphqlItem: GraphQLRequest = {
  info: { name: 'GraphQL Details', type: 'graphql', description: 'Fetch a country by its code.' },
  graphql: {
    method: 'POST',
    url: '{{baseUrl}}/graphql',
    headers: [{ name: 'x-api-key', value: 'abc123', description: 'The api key' }],
    body: {
      query: 'query {\n  country(code: "IN") {\n    name\n    capital\n  }\n}',
      variables: '{\n  "countryCode": "{{countryCode}}"\n}'
    },
    auth: { type: 'basic', username: 'user@example.com', password: 'supersecret' }
  },
  runtime: {
    variables: [{ name: 'countryCode', value: 'IN' }],
    assertions: [{ expression: 'res.status', operator: 'eq', value: '200' }],
    scripts: [{ type: 'tests', code: 'test("ok", () => {})' }],
    actions: [
      {
        type: 'set-variable',
        phase: 'after-response',
        description: 'the resolved country name',
        selector: { expression: 'res.body.data.country.name', method: 'jsonq' },
        variable: { name: 'countryName', scope: 'runtime' }
      }
    ]
  }
} as unknown as GraphQLRequest;

describe('GraphQL request page', () => {
  it('renders the name, POST method, url and description with the shared request layout', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={graphqlItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'graphql-request-page')).toBeTruthy();
    expect(getByTestId(root, 'request-breadcrumb').text).toContain('Authentication');
    expect(getByTestId(root, 'request-title').text).toContain('GraphQL Details');
    expect(getByTestId(root, 'request-method').text).toContain('POST');
    expect(getByTestId(root, 'request-url').text).toContain('graphql');
    expect(getByTestId(root, 'request-description').text).toContain('Fetch a country');
  });

  it('renders the Query and Variables sections instead of a Body section', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={graphqlItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    expect(queryByTestId(root, 'request-section-body')).toBeNull();

    const query = getByTestId(root, 'request-section-query');
    expect(query.text).toContain('country');
    expect(queryByTestId(root, 'request-graphql-query')).not.toBeNull();

    const variables = getByTestId(root, 'request-section-variables');
    expect(variables.text).toContain('countryCode');
    expect(queryByTestId(root, 'request-graphql-variables')).not.toBeNull();
  });

  it('does not render a Try button (the interactive playground does not support graphql yet)', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={graphqlItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  it('reuses the shared Headers, Auth, Code Snippet and Execution Context sections', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={graphqlItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    const headers = getByTestId(root, 'request-section-headers');
    expect(headers.text).toContain('x-api-key');
    expect(headers.text).toContain('x-collection');

    const auth = getByTestId(root, 'request-section-auth');
    expect(auth.text).toContain('Basic');
    expect(auth.text).toContain('user@example.com');

    const snippet = getByTestId(root, 'request-section-code-snippet');
    expect(snippet.text).toContain('curl');
    expect(snippet.text).toContain('/graphql');
    expect(snippet.text).toContain('query');

    const exec = getByTestId(root, 'execution-context');
    expect(exec.text).toContain('countryCode');
    expect(exec.text).toContain('countryName');
    expect(exec.text).toContain('the resolved country name');
    expect(queryByTestId(root, 'execution-context-tabs-tab-asserts')).not.toBeNull();
    expect(queryByTestId(root, 'execution-context-tabs-tab-tests')).not.toBeNull();
  });

  it('shows the config empty state when a graphql request has no query, headers or auth', () => {
    const bare = {
      info: { name: 'Empty GQL', type: 'graphql' },
      graphql: { method: 'POST', url: '/graphql' }
    } as unknown as GraphQLRequest;
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={bare} ancestry={ancestry} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-title').text).toContain('Empty GQL');
    expect(queryByTestId(root, 'request-section-query')).toBeNull();
    expect(queryByTestId(root, 'request-config-empty')).not.toBeNull();
    expect(queryByTestId(root, 'request-section-code-snippet')).not.toBeNull();
  });

  it('renders the Params section when the graphql request declares params', () => {
    const withParams = {
      info: { name: 'GQL with params', type: 'graphql' },
      graphql: { method: 'POST', url: '/graphql', params: [{ name: 'apiVersion', value: 'v2', type: 'query' }] }
    } as unknown as GraphQLRequest;
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={withParams} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    const params = getByTestId(root, 'request-section-params');
    expect(params.text).toContain('apiVersion');
  });

  it('renders the Query section but omits Variables when the variables block is empty', () => {
    const queryOnly = {
      info: { name: 'Query Only GQL', type: 'graphql' },
      graphql: { method: 'POST', url: '/graphql', body: { query: 'query { me }', variables: '' } }
    } as unknown as GraphQLRequest;
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={queryOnly} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    expect(queryByTestId(root, 'request-section-query')).not.toBeNull();
    expect(queryByTestId(root, 'request-section-variables')).toBeNull();
    expect(queryByTestId(root, 'request-config-empty')).toBeNull();
  });

  it('renders an inherited auth badge when the graphql request auth is "inherit"', () => {
    const parent = {
      info: { name: 'Country API', version: '1.0.0' },
      request: { auth: { type: 'bearer', token: '{{tok}}' } }
    } as unknown as OpenCollection;
    const inheritItem = {
      info: { name: 'Inherited Auth GQL', type: 'graphql' },
      graphql: { method: 'POST', url: '/graphql', auth: 'inherit', body: { query: 'query { me }' } }
    } as unknown as GraphQLRequest;
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={inheritItem} ancestry={ancestry} collection={parent} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    const auth = getByTestId(root, 'request-section-auth');
    expect(auth.text).toContain('Inherited');
    expect(queryByTestId(root, 'request-auth-inherited')).not.toBeNull();
  });

  it('labels the script-chain request marker as GQL', () => {
    const withScript = {
      info: { name: 'GQL with script', type: 'graphql' },
      graphql: { method: 'POST', url: '/graphql', body: { query: 'query { me }' } },
      runtime: { scripts: [{ type: 'before-request', code: 'bru.setVar("t", 1);' }] }
    } as unknown as GraphQLRequest;
    const root = useRenderToDom(
      <MemoryRouter>
        <GraphqlRequest item={withScript} ancestry={ancestry} collection={collection} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'script-chain-request-label').text).toBe('GQL');
  });
});
