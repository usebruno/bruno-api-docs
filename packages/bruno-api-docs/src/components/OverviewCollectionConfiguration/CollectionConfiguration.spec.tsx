import React from 'react';
import { describe, it, expect } from 'vitest';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import { CollectionConfiguration } from './CollectionConfiguration';
import type { Auth } from '@opencollection/types/common/auth';
import { AUTH_MODE_LABELS } from '@/constants';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import type { PreRequestVarRow } from '@/utils/request';

describe('CollectionConfiguration', () => {
  it('renders nothing when there is no configuration', () => {
    expect(useRenderToDom(<CollectionConfiguration sectionType="request" />).toString()).toBe('');
    expect(useRenderToDom(<CollectionConfiguration sectionType="execution" />).toString()).toBe('');
  });

  it('renders enabled and disabled headers and masks secret auth values', () => {
    const headers: HttpRequestHeader[] = [
      { name: 'Accept', value: 'application/json' },
      { name: 'X-Disabled', value: 'nope', disabled: true }
    ];

    const root = useRenderToDom(
      <CollectionConfiguration
        headers={headers}
        auth={{ type: 'basic', username: 'user@example.com', password: 's3cr3t' }}
        authModeLabels={AUTH_MODE_LABELS}
        sectionType="request"
      />
    );

    const headersTable = getByTestId(root, 'collection-config-headers');
    expect(headersTable.text).toContain('Accept');
    expect(headersTable.text).toContain('application/json');
    expect(headersTable.text).toContain('X-Disabled');
    expect(queryByTestId(headersTable, 'disabled-badge')).not.toBeNull();

    const auth = getByTestId(root, 'collection-config-auth');
    expect(auth.text).toContain('Basic Auth');
    expect(auth.text).toContain('user@example.com');
    expect(auth.text).not.toContain('s3cr3t');
  });

  it('renders the script and test code', () => {
    const root = useRenderToDom(
      <CollectionConfiguration
        scripts={{ preRequest: 'console.log("pre")', tests: 'test("ok", () => {})' }}
        sectionType="execution"
      />
    );

    expect(getByTestId(root, 'collection-config-script-subheading').text.trim()).toBe('Script');
    expect(root.text).toContain('Pre-Request');
    expect(getByTestId(root, 'collection-config-tests').text).toContain('test("ok"');
  });

  it('renders header descriptions', () => {
    const root = useRenderToDom(
      <CollectionConfiguration
        headers={[{ name: 'Accept', value: 'application/json', description: 'content negotiation' } as HttpRequestHeader]}
        sectionType="request"
      />
    );
    expect(getByTestId(root, 'collection-config-headers').text).toContain('content negotiation');
  });

  it('renders collection variables (pre-request + post-response)', () => {
    const root = useRenderToDom(
      <CollectionConfiguration
        preVars={[{ name: 'baseUrl', value: 'https://api.example.com' }]}
        postVars={[{ name: 'token', expression: 'res.body.token' }]}
        sectionType="execution"
      />
    );
    expect(getByTestId(root, 'collection-config-vars-subheading').text.trim()).toBe('Variables');
    expect(root.text).toContain('baseUrl');
    expect(root.text).toContain('https://api.example.com');
    expect(root.text).toContain('token');
    expect(root.text).toContain('res.body.token');
  });

  it('falls back to the raw auth type when no label is supplied', () => {
    const root = useRenderToDom(<CollectionConfiguration auth={{ type: 'bearer', token: 't' }} sectionType="request" />);
    expect(getByTestId(root, 'collection-config-auth').text).toContain('bearer');
  });

  it('omits the subsections that have no content', () => {
    const root = useRenderToDom(<CollectionConfiguration auth={{ type: 'bearer', token: 't' }} sectionType="request" />);
    expect(getByTestId(root, 'collection-config-auth-subheading').text.trim()).toBe('Auth');
    expect(queryByTestId(root, 'collection-config-headers-subheading')).toBeNull();
  });
});

describe('CollectionConfiguration sectionType', () => {
  const props = {
    headers: [{ name: 'Accept', value: 'application/json' }] as HttpRequestHeader[],
    auth: { type: 'bearer', token: 't' } as Auth,
    scripts: { preRequest: 'console.log("pre")', tests: 'test("ok", () => {})' },
    preVars: [{ name: 'v', value: '1' }] as PreRequestVarRow[]
  };

  it('renders only headers and auth for the request section', () => {
    const root = useRenderToDom(<CollectionConfiguration {...props} sectionType="request" />);
    expect(getByTestId(root, 'collection-config-headers-subheading').text.trim()).toBe('Headers');
    expect(getByTestId(root, 'collection-config-auth-subheading').text.trim()).toBe('Auth');
    expect(queryByTestId(root, 'collection-config-vars-subheading')).toBeNull();
    expect(queryByTestId(root, 'collection-config-script-subheading')).toBeNull();
    expect(queryByTestId(root, 'collection-config-tests-subheading')).toBeNull();
  });

  it('renders only variables, script and tests for the execution section', () => {
    const root = useRenderToDom(<CollectionConfiguration {...props} sectionType="execution" />);
    expect(getByTestId(root, 'collection-config-vars-subheading').text.trim()).toBe('Variables');
    expect(getByTestId(root, 'collection-config-script-subheading').text.trim()).toBe('Script');
    expect(getByTestId(root, 'collection-config-tests-subheading').text.trim()).toBe('Tests');
    expect(queryByTestId(root, 'collection-config-headers-subheading')).toBeNull();
    expect(queryByTestId(root, 'collection-config-auth-subheading')).toBeNull();
  });
});
