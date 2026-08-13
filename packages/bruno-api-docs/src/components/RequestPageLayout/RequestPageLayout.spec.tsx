import React from 'react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RequestPageLayout } from './RequestPageLayout';
import type { RequestPageData } from '@/hooks/useRequestPageData';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';

const makeData = (overrides: Partial<RequestPageData> = {}): RequestPageData =>
  ({
    name: 'Get Users',
    url: '{{baseUrl}}/users',
    descHtml: '',
    pathParams: [],
    queryParams: [],
    ownAuth: undefined,
    effectiveAuth: undefined,
    effectiveHeaders: [],
    showAuth: false,
    authSource: undefined,
    inheritedHeaders: [],
    headerTableRows: [],
    hasHeaders: false,
    hasInheritedHeaders: false,
    hasParams: false,
    segments: [{ name: 'Overview', uuid: 'collection-root' }],
    scriptChain: [],
    preVars: [],
    postVars: [],
    inheritedPreVars: [],
    inheritedPostVars: [],
    assertions: [],
    tests: [],
    testScripts: [],
    scriptFlow: 'sandwich',
    hasExecutionContext: false,
    ...overrides
  }) as unknown as RequestPageData;

const layout = (
  data: RequestPageData,
  overrides: Partial<React.ComponentProps<typeof RequestPageLayout>> = {}
) => (
  <MemoryRouter>
    <RequestPageLayout
      data={data}
      method="GET"
      hasConfigContent={false}
      emptyConfigSubheading="This request has no parameters, body, headers, or authentication configured."
      {...overrides}
    >
      <div data-testid="body-child" />
    </RequestPageLayout>
  </MemoryRouter>
);

describe('RequestPageLayout', () => {
  it('renders the breadcrumb, title, url and code-snippet section', () => {
    const root = useRenderToDom(layout(makeData({ name: 'Get Users', url: '/api/users' })));
    expect(getByTestId(root, 'request-page')).toBeTruthy();
    expect(getByTestId(root, 'request-title').text).toContain('Get Users');
    expect(getByTestId(root, 'request-breadcrumb')).toBeTruthy();
    expect(getByTestId(root, 'request-section-code-snippet')).toBeTruthy();
    expect(root.text).toContain('/api/users');
  });

  it('renders the description only when descHtml is present', () => {
    expect(queryByTestId(useRenderToDom(layout(makeData({ descHtml: '' }))), 'request-description')).toBeNull();
    expect(
      getByTestId(useRenderToDom(layout(makeData({ descHtml: '<p>Docs here</p>' }))), 'request-description').text
    ).toContain('Docs here');
  });

  it('shows the empty-config state when there is no config and no execution context', () => {
    const root = useRenderToDom(layout(makeData(), { emptyConfigSubheading: 'Nothing configured here.' }));
    const empty = getByTestId(root, 'request-config-empty');
    expect(empty.text).toContain('No request configuration');
    expect(empty.text).toContain('Nothing configured here.');
  });

  it('omits the empty-config state when only an execution context is present', () => {
    const root = useRenderToDom(layout(makeData({ hasExecutionContext: true })));
    expect(queryByTestId(root, 'request-config-empty')).toBeNull();
  });

  it('renders the Params, Headers and Auth sections plus the children when configured', () => {
    const root = useRenderToDom(layout(makeData({ hasParams: true, hasHeaders: true, showAuth: true })));
    expect(getByTestId(root, 'request-section-params')).toBeTruthy();
    expect(getByTestId(root, 'request-section-headers')).toBeTruthy();
    expect(getByTestId(root, 'request-section-auth')).toBeTruthy();
    expect(getByTestId(root, 'body-child')).toBeTruthy();
    expect(queryByTestId(root, 'request-config-empty')).toBeNull();
  });

  it('shows the inherited-auth badge when the auth is inherited from a resolved source', () => {
    const root = useRenderToDom(
      layout(
        makeData({
          showAuth: true,
          ownAuth: 'inherit',
          authSource: { level: 'folder', name: 'Authentication', uuid: 'folder-1' }
        })
      )
    );
    expect(getByTestId(root, 'request-auth-inherited')).toBeTruthy();
  });

  it('renders the execution context when present, otherwise its empty state', () => {
    expect(
      getByTestId(useRenderToDom(layout(makeData({ hasExecutionContext: false }))), 'execution-context-empty')
    ).toBeTruthy();
    const withExec = useRenderToDom(layout(makeData({ hasExecutionContext: true })));
    expect(getByTestId(withExec, 'request-section-execution-context')).toBeTruthy();
    expect(queryByTestId(withExec, 'execution-context-empty')).toBeNull();
  });

  it('renders afterColumns content', () => {
    const root = useRenderToDom(layout(makeData(), { afterColumns: <div data-testid="after-cols" /> }));
    expect(getByTestId(root, 'after-cols')).toBeTruthy();
  });
});
