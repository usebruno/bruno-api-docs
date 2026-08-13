import React from 'react';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Item } from '@opencollection/types/collection/item';
import { MemoryRouter } from 'react-router-dom';
import type { RequestItem } from '@/utils/schemaHelpers';
import { Request } from './Request';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';

const collection: OpenCollection = {
  info: { name: 'Auth API', version: '1.0.0' },
  request: {
    scripts: [{ type: 'tests', code: 'test("collection-level check", () => {})' }]
  }
};

const ancestry: Item[] = [
  { uuid: 'folder-1', info: { name: 'Authentication', type: 'folder' } } as unknown as Item
];

const item: HttpRequest = {
  info: { name: 'Login', type: 'http', description: 'Authenticate a user and return a token.' },
  http: {
    method: 'post',
    url: '{{baseUrl}}/auth/login',
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    params: [
      { name: 'tenant', value: 'acme', type: 'path' },
      { name: 'verbose', value: 'true', type: 'query' }
    ],
    body: { type: 'json', data: '{"email":"a@b.com"}' }
  },
  runtime: {
    auth: { type: 'bearer', token: '{{token}}' },
    variables: [{ name: 'attempt', value: '1' }],
    assertions: [{ expression: 'res.status', operator: 'eq', value: '200' }],
    scripts: [
      { type: 'before-request', code: 'console.log("pre")' },
      { type: 'tests', code: 'test("returns a token", () => {})' }
    ],
    actions: [
      {
        type: 'set-variable',
        selector: { expression: 'res.body.token', method: 'jsonq' },
        variable: { name: 'authToken', scope: 'runtime' }
      }
    ]
  } as HttpRequest['runtime'],
  examples: [{ name: 'Success', response: { status: 200, body: { type: 'json', data: '{"token":"x"}' } } }]
};

describe('Request page', () => {
  it('renders the breadcrumb, heading, url bar, description and all populated sections', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={item} ancestry={ancestry} collection={collection} onTryClick={() => {}} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-breadcrumb').text).toContain('Authentication');
    expect(getByTestId(root, 'request-title').text).toContain('Login');
    expect(getByTestId(root, 'request-url').text).toContain('auth/login');
    expect(getByTestId(root, 'request-try-button').text).toContain('Try');
    expect(getByTestId(root, 'request-description').text).toContain('Authenticate a user');
    // {{baseUrl}} in the url renders as an inspectable variable token
    expect(root.querySelector('[data-var-name="baseUrl"]')).not.toBeNull();

    for (const slug of ['params', 'body', 'headers', 'auth', 'code-snippet', 'examples', 'execution-context']) {
      expect(queryByTestId(root, `request-section-${slug}`)).not.toBeNull();
    }

    const params = getByTestId(root, 'request-section-params');
    expect(params.text).toContain('tenant');
    expect(params.text).toContain('verbose');

    const snippet = getByTestId(root, 'request-section-code-snippet');
    expect(snippet.text).toContain('curl');
    expect(snippet.text).toContain('/auth/login');

    const exec = getByTestId(root, 'execution-context');
    expect(exec.text).toContain('attempt');
    expect(exec.text).toContain('authToken');
    expect(queryByTestId(root, 'execution-context-tabs-tab-scripts')).not.toBeNull();
    expect(queryByTestId(root, 'execution-context-tabs-tab-asserts')).not.toBeNull();
    expect(queryByTestId(root, 'execution-context-tabs-tab-tests')).not.toBeNull();
  });

  it('shows empty states (not bare sections) when nothing is configured, and always shows the code snippet', () => {
    const bare: HttpRequest = {
      info: { name: 'Ping', type: 'http' },
      http: { method: 'get', url: '/ping' }
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={bare} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-title').text).toContain('Ping');
    expect(getByTestId(root, 'request-url').text).toContain('/ping');
    // No params/body/headers/auth -> a single "No request configuration" empty state, not the individual sections.
    expect(queryByTestId(root, 'request-config-empty')).not.toBeNull();
    expect(queryByTestId(root, 'request-section-params')).toBeNull();
    // The code snippet is always shown (on the right).
    expect(queryByTestId(root, 'request-section-code-snippet')).not.toBeNull();
    // No examples authored -> the Examples section is hidden entirely (no empty state).
    expect(queryByTestId(root, 'request-section-examples')).toBeNull();
    // No scripts/vars/asserts/tests -> the Execution Context section shows its own empty state.
    expect(queryByTestId(root, 'request-section-execution-context')).not.toBeNull();
    expect(queryByTestId(root, 'execution-context-empty')).not.toBeNull();
  });

  it('renders the Auth section for auth declared in the http block (http.auth: inherit)', () => {
    // Real collections (e.g. bruno-genui-collection) put auth at http.auth, not runtime.auth.
    const inheritItem: HttpRequest = {
      info: { name: 'Get All Customers', type: 'http' },
      http: { method: 'GET', url: '{{baseUrl}}/billing/customers', auth: 'inherit' }
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={inheritItem} collection={collection} ancestry={ancestry} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-section-auth').text).toContain('Inherit');
    expect(queryByTestId(root, 'request-section-code-snippet')).not.toBeNull();
  });

  it('shows inherited headers, variables and auth from the folder/collection, each linked to its source', () => {
    const parentCollection: OpenCollection = {
      info: { name: 'Billing API', version: '1.0.0' },
      request: {
        headers: [{ name: 'X-Api-Version', value: 'v2' }],
        auth: { type: 'bearer', token: '{{tok}}' },
        variables: [{ name: 'colVar', value: 'cv' }],
        actions: [
          {
            type: 'set-variable',
            phase: 'after-response',
            selector: { expression: 'res.body.x', method: 'jsonq' },
            variable: { name: 'colPost', scope: 'runtime' }
          }
        ]
      }
    } as unknown as OpenCollection;
    const ancestry2: Item[] = [
      {
        uuid: 'folder-9',
        info: { name: 'Invoices', type: 'folder' },
        request: { auth: 'inherit', headers: [{ name: 'X-Folder', value: 'f' }] }
      } as unknown as Item
    ];
    const inheritItem: HttpRequest = {
      info: { name: 'List', type: 'http' },
      http: { method: 'GET', url: '/invoices', auth: 'inherit', headers: [{ name: 'Accept', value: 'application/json' }] }
    };

    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={inheritItem} collection={parentCollection} ancestry={ancestry2} onBreadcrumbClick={() => {}} />
      </MemoryRouter>
    );

    // Own and inherited headers share one table; the count chip sits on the "Headers" line.
    const headers = getByTestId(root, 'request-section-headers');
    expect(headers.text).toContain('Accept'); // own
    expect(headers.text).toContain('X-Api-Version'); // inherited from collection
    expect(headers.text).toContain('X-Folder'); // inherited from folder
    expect(headers.text).toContain('2 headers inherited'); // count chip, exactly two inherited
    // A single table (no separate inherited table) with a "go to source" link per inherited row.
    expect(headers.querySelectorAll('[data-testid="property-table"]')).toHaveLength(1);
    expect(headers.querySelectorAll('[data-testid="inherited-source"]')).toHaveLength(2);

    // Inherited auth keeps the existing chip, labelled by level and parent name, and is clickable (role=button).
    expect(getByTestId(root, 'request-section-auth').text).toContain('Inherited from collection: Billing API');
    const authChip = getByTestId(root, 'request-auth-inherited');
    expect(authChip.getAttribute('role')).toBe('button');
    expect(authChip.getAttribute('title')).toContain('Billing API'); // tooltip still names the parent

    const codeSnippet = getByTestId(root, 'request-section-code-snippet');
    expect(codeSnippet.text).toContain('Accept'); // own header
    expect(codeSnippet.text).toContain('X-Api-Version'); // inherited from collection
    expect(codeSnippet.text).toContain('X-Folder'); // inherited from folder
    expect(codeSnippet.text).toContain('Authorization'); // resolved inherited bearer auth

    // Inherited pre/post variables surface in the execution context, with a count chip.
    const exec = getByTestId(root, 'execution-context');
    expect(exec.text).toContain('colVar');
    expect(exec.text).toContain('colPost');
    expect(exec.text).toContain('2 vars inherited');
  });

  it('does not show the empty state when a request only inherits config (no own config)', () => {
    const parentCollection: OpenCollection = {
      info: { name: 'C', version: '1.0.0' },
      request: { headers: [{ name: 'X-Inherited', value: 'y' }] }
    } as unknown as OpenCollection;
    const onlyInherits: HttpRequest = {
      info: { name: 'Ping', type: 'http' },
      http: { method: 'GET', url: '/ping' } // no own params/body/headers/auth
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={onlyInherits} collection={parentCollection} />
      </MemoryRouter>
    );
    // The Headers section renders (inherited-only) and the "No request configuration" state is suppressed.
    const headers = getByTestId(root, 'request-section-headers');
    expect(headers.text).toContain('X-Inherited');
    expect(headers.text).toContain('1 header inherited'); // singular
    expect(queryByTestId(root, 'request-config-empty')).toBeNull();
  });

  it('suppresses the "No request configuration" empty state when a request inherits only variables', () => {
    const parentCollection: OpenCollection = {
      info: { name: 'C', version: '1.0.0' },
      request: { variables: [{ name: 'colVar', value: 'cv' }] }
    } as unknown as OpenCollection;
    const varsOnly: HttpRequest = {
      info: { name: 'Ping', type: 'http' },
      http: { method: 'GET', url: '/ping' } // no own config and no auth field
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={varsOnly} collection={parentCollection} />
      </MemoryRouter>
    );
    expect(queryByTestId(root, 'request-config-empty')).toBeNull();
    expect(getByTestId(root, 'execution-context').text).toContain('colVar');
  });

  it('shows the resolved inherited auth in the code snippet, not an inherited raw Authorization header', () => {
    const parentCollection: OpenCollection = {
      info: { name: 'C', version: '1.0.0' },
      request: {
        auth: { type: 'bearer', token: '{{tok}}' },
        headers: [{ name: 'Authorization', value: 'Basic legacy' }]
      }
    } as unknown as OpenCollection;
    const inheritsBoth: HttpRequest = {
      info: { name: 'R', type: 'http' },
      http: { method: 'GET', url: '/x', auth: 'inherit' }
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={inheritsBoth} collection={parentCollection} />
      </MemoryRouter>
    );
    const snippet = getByTestId(root, 'request-section-code-snippet');
    expect(snippet.text).toContain('Bearer'); // the nearer resolved effective auth wins
    expect(snippet.text).not.toContain('Basic legacy'); // the inherited raw Authorization is not emitted
  });

  it('does not apply smart typography to docs prose', () => {
    const docsItem: HttpRequest = {
      info: { name: 'Doc test', type: 'http' },
      http: { method: 'GET', url: '/x' },
      docs: 'Use -- dashes and (c) marks literally.'
    };
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={docsItem} />
      </MemoryRouter>
    );

    const description = getByTestId(root, 'request-description');
    expect(description.text).toContain('Use -- dashes');
    expect(description.text).toContain('(c)');
    expect(description.text).not.toContain('–'); // en-dash
    expect(description.text).not.toContain('©'); // ©
  });
});

describe('Request — unrecognised request types', () => {
  const unknownItem = (data: Record<string, unknown>): RequestItem => data as unknown as RequestItem;

  it('renders a type the viewer has no page for as a request rather than a blank page', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={unknownItem({ info: { name: 'Quantum Ping', type: 'quic' }, url: 'quic://h:1' })} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-page')).toBeTruthy();
    expect(getByTestId(root, 'request-title').text).toContain('Quantum Ping');
  });

  it('does the same for an item that names no type at all', () => {
    const root = useRenderToDom(
      <MemoryRouter>
        <Request item={unknownItem({ info: { name: 'Mystery' } })} />
      </MemoryRouter>
    );

    expect(getByTestId(root, 'request-page')).toBeTruthy();
    expect(getByTestId(root, 'request-title').text).toContain('Mystery');
  });
});
