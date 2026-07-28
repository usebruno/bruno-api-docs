import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query, getByTestId, queryByTestId } from '../../test-utils/dom';
import { FolderConfiguration } from './FolderConfiguration';
import type { FolderConfig } from '../../utils/folder';

const baseConfig: FolderConfig = {
  headers: [],
  auth: undefined,
  authSource: undefined,
  preRequest: undefined,
  postResponse: undefined,
  tests: undefined,
  variables: [],
  postVariables: [],
  inheritedHeaders: [],
  inheritedPreVariables: [],
  inheritedPostVariables: []
};

const folderSource = { level: 'folder' as const, name: 'Folder A', uuid: 'folder-uid' };

describe('FolderConfiguration', () => {
  it('shows only the groups that have content and omits the empty ones', () => {
    const config: FolderConfig = {
      ...baseConfig,
      headers: [{ name: 'Accept', value: 'application/json' }],
      preRequest: 'console.log(1)'
    };
    const root = useRenderToDom(<FolderConfiguration config={config} />);

    expect(queryByTestId(root, 'folder-config-headers')).not.toBeNull();
    expect(queryByTestId(root, 'folder-config-script')).not.toBeNull();
    expect(query(root, '[data-testid="folder-config-headers"] .property-key').text.trim()).toBe('Accept');

    expect(queryByTestId(root, 'folder-config-auth')).toBeNull();
    expect(queryByTestId(root, 'folder-config-vars')).toBeNull();
    expect(queryByTestId(root, 'folder-config-tests')).toBeNull();
  });

  it('labels the Auth group with an "Inherited from collection" badge when auth is inherited', () => {
    const config: FolderConfig = {
      ...baseConfig,
      auth: { type: 'bearer', token: 't' } as any,
      authSource: { level: 'collection', name: 'API', uuid: '__collection_root__' }
    };
    const root = useRenderToDom(<FolderConfiguration config={config} authModeLabels={{ bearer: 'Bearer Token' }} />);

    const authGroup = getByTestId(root, 'folder-config-auth');
    expect(query(authGroup, '.config-group-head').text).toContain('Inherited from collection: API');
  });

  it('makes the inherited-auth chip a clickable button when a navigate handler is provided', () => {
    const config: FolderConfig = {
      ...baseConfig,
      auth: { type: 'bearer', token: 't' } as any,
      authSource: { level: 'folder', name: 'Parent', uuid: 'parent-uid' }
    };
    const root = useRenderToDom(<FolderConfiguration config={config} onNavigate={() => {}} />);
    const chip = getByTestId(root, 'folder-config-auth-inherited');
    expect(chip.text).toContain('Inherited from folder: Parent');
    expect(chip.getAttribute('role')).toBe('button');
    expect(chip.getAttribute('title')).toContain('Parent');
  });

  it('appends inherited headers to the Headers table with a count chip and a goto link per row', () => {
    const config: FolderConfig = {
      ...baseConfig,
      headers: [{ name: 'Accept', value: 'application/json' }],
      inheritedHeaders: [
        { name: 'X-Api-Version', value: 'v2', source: folderSource },
        { name: 'Authorization', value: 'Bearer x', source: folderSource }
      ]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} onNavigate={() => {}} />);
    const headers = getByTestId(root, 'folder-config-headers');
    expect(headers.text).toContain('Accept'); // own
    expect(headers.text).toContain('X-Api-Version'); // inherited
    expect(headers.text).toContain('2 headers inherited'); // count chip
    expect(headers.querySelectorAll('[data-testid="property-table"]')).toHaveLength(1);
    expect(headers.querySelectorAll('[data-testid="inherited-source"]')).toHaveLength(2);
  });

  it('shows a Headers group made only of inherited headers when the folder defines none itself', () => {
    const config: FolderConfig = {
      ...baseConfig,
      inheritedHeaders: [{ name: 'X-Api-Version', value: 'v2', source: folderSource }]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} onNavigate={() => {}} />);
    const headers = getByTestId(root, 'folder-config-headers');
    expect(headers.text).toContain('X-Api-Version');
    expect(headers.text).toContain('1 header inherited');
  });

  it('appends inherited variables to the Pre/Post columns with a combined count chip', () => {
    const config: FolderConfig = {
      ...baseConfig,
      variables: [{ name: 'ownPre', value: '1' }],
      inheritedPreVariables: [{ name: 'baseUrl', value: '{{host}}', source: folderSource }],
      inheritedPostVariables: [{ name: 'sessionId', expression: 'res.body.id', source: folderSource }]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} onNavigate={() => {}} />);
    const vars = getByTestId(root, 'folder-config-vars');
    expect(vars.text).toContain('ownPre');
    expect(vars.text).toContain('baseUrl');
    expect(vars.text).toContain('sessionId');
    expect(vars.text).toContain('2 vars inherited');
    expect(vars.querySelectorAll('[data-testid="inherited-source"]')).toHaveLength(2);
  });

  it('renders Pre-Request and Post-Response script columns and a separate Tests group', () => {
    const config: FolderConfig = {
      ...baseConfig,
      preRequest: 'pre()',
      postResponse: 'post()',
      tests: 'test()'
    };
    const root = useRenderToDom(<FolderConfiguration config={config} />);

    const phases = getByTestId(root, 'folder-config-script')
      .querySelectorAll('.config-phase-label')
      .map((el) => el.text.trim());
    expect(phases).toEqual(['Pre-Request', 'Post-Response']);
    expect(queryByTestId(root, 'folder-config-tests')).not.toBeNull();
  });

  it('renders disabled headers with a Disabled chip and their descriptions', () => {
    const config: FolderConfig = {
      ...baseConfig,
      headers: [{ name: 'X-Debug', value: 'on', disabled: true, description: 'toggles debug logging' }]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} />);

    const headers = getByTestId(root, 'folder-config-headers');
    expect(query(headers, '.property-key').text.trim()).toBe('X-Debug');
    expect(query(headers, '.disabled-badge')).not.toBeNull();
    expect(headers.text).toContain('toggles debug logging');
  });

  it('renders both Pre-Request and Post-Response variable columns', () => {
    const config: FolderConfig = {
      ...baseConfig,
      variables: [{ name: 'baseUrl', value: 'https://api.example.com' }],
      postVariables: [{ name: 'token', expression: 'res.body.token', scope: 'runtime' }]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} />);

    const vars = getByTestId(root, 'folder-config-vars');
    const phases = vars.querySelectorAll('.config-phase-label').map((el) => el.text.trim());
    expect(phases).toEqual(['Pre-Request', 'Post-Response']);
    expect(vars.text).toContain('baseUrl');
    expect(vars.text).toContain('token');
    expect(vars.text).toContain('res.body.token');
  });

  it('shows only the Post-Response column when there are no pre-request vars', () => {
    const config: FolderConfig = {
      ...baseConfig,
      postVariables: [{ name: 'sessionId', expression: 'res.body.id', scope: 'runtime' }]
    };
    const root = useRenderToDom(<FolderConfiguration config={config} />);

    const vars = getByTestId(root, 'folder-config-vars');
    const phases = vars.querySelectorAll('.config-phase-label').map((el) => el.text.trim());
    expect(phases).toEqual(['Post-Response']);
  });
});
