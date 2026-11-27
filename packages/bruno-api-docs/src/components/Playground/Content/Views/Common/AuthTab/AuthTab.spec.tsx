import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, it, expect } from 'vitest';
import { getByTestId, query, queryByTestId } from '@/test-utils/dom';
import { AUTH_DEFAULTS, AUTH_MODE_LABELS, PLACEMENT_OPTIONS } from '@/constants';
import { COLLECTION_ROOT_CRUMB } from '@/utils/common';
import { AuthTab } from './AuthTab';

const render = (ui: React.ReactElement) => {
  const root = parse(renderToStaticMarkup(ui));
  root.querySelectorAll('style').forEach((style) => style.remove());
  const byTestId = (testId: string) => root.querySelector(`[data-testid="${testId}"]`);
  const getByTestId = (testId: string) => {
    const el = byTestId(testId);
    if (!el) throw new Error(`No element with data-testid="${testId}"`);
    return el;
  };
  return { root, byTestId, getByTestId };
};

const noop = () => {};

const renderAuth = (auth: unknown, extra: Record<string, unknown> = {}) =>
  render(<AuthTab auth={auth} onAuthChange={noop} showFullAuth item={{ request: {} }} onItemChange={noop} {...extra} />);

describe('AuthTab', () => {
  it('offers exactly the five supported auth types and none of the unsupported ones', () => {
    const modeLabels = ['No Auth', ...Object.keys(AUTH_DEFAULTS).map((mode) => AUTH_MODE_LABELS[mode] ?? mode)];
    expect(modeLabels).toEqual(['No Auth', 'Basic Auth', 'Bearer Token', 'API Key', 'Digest Auth']);
    ['aws', 'signature', 'oauth', 'wsse', 'ntlm', 'edgegrid', 'akamai'].forEach((excluded) =>
      expect(modeLabels.join(' ').toLowerCase()).not.toContain(excluded)
    );
  });

  it('shows the current auth type on the mode trigger', () => {
    expect(renderAuth(undefined).getByTestId('auth-tab-mode-select').text).toContain('No Auth');
    expect(renderAuth({ type: 'bearer', token: 'abc' }).getByTestId('auth-tab-mode-select').text).toContain('Bearer Token');
    expect(renderAuth({ type: 'digest', username: 'u', password: 'p' }).getByTestId('auth-tab-mode-select').text).toContain('Digest Auth');
  });

  it('offers Inherit as a mode only when showInherit is set', () => {
    // Enabled: inherit is selectable and shows on the trigger.
    expect(renderAuth('inherit', { showInherit: true }).getByTestId('auth-tab-mode-select').text).toContain('Inherit');
    // Disabled: inherit is not an option, so nothing matches and the trigger shows no label.
    expect(renderAuth('inherit').getByTestId('auth-tab-mode-select').text.trim()).toBe('');
  });

  it('renders no form for None', () => {
    const { root, byTestId } = renderAuth(undefined);
    expect(root.querySelector('.auth-form')).toBeNull();
    expect(byTestId('auth-username')).toBeNull();
    expect(getByTestId(root, 'no-content-text').text.trim()).toBe('No authentication configured.');
  });

  it('names the collection it inherits from and shows its bearer token read-only', () => {
    const { getByTestId, byTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: {
        auth: { type: 'bearer', token: 'collection-token' },
        source: { level: 'collection', name: 'Bruno Testbench', uuid: COLLECTION_ROOT_CRUMB }
      }
    });
    expect(getByTestId('auth-inherited-source').text.replace(/\s+/g, ' ').trim()).toBe(
      'Auth inherited from Bruno Testbench Bearer Token'
    );
    const token = getByTestId('auth-inherited-token');
    expect(token.getAttribute('value')).toBe('collection-token');
    expect(token.getAttribute('type')).toBe('password');
    expect(token.hasAttribute('readonly')).toBe(true);
    getByTestId('auth-inherited-token-toggle');
    expect(byTestId('auth-token')).toBeNull();
  });

  it('makes the mode a navigation button only when a handler and a source uuid exist', () => {
    const source = { level: 'folder', name: 'invoices', uuid: 'folder-uuid' };
    const auth = { type: 'bearer', token: 't' };
    const withHandler = renderAuth('inherit', { showInherit: true, inheritedAuth: { auth, source }, onNavigateToSource: noop });
    const link = withHandler.getByTestId('inherited-auth-mode');
    expect(link.tagName).toBe('BUTTON');
    expect(link.getAttribute('aria-label')).toBe('Open Bearer Token auth in invoices');

    const withoutHandler = renderAuth('inherit', { showInherit: true, inheritedAuth: { auth, source } });
    expect(withoutHandler.getByTestId('inherited-auth-mode').tagName).toBe('SPAN');

    const withoutUuid = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: { auth, source: { ...source, uuid: '' } },
      onNavigateToSource: noop
    });
    expect(withoutUuid.getByTestId('inherited-auth-mode').tagName).toBe('SPAN');
  });

  it('shows an inherited API key read-only with its placement locked', () => {
    const { getByTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: {
        auth: { type: 'apikey', key: 'X-API-Key', value: 'secret', placement: 'header' },
        source: { level: 'folder', name: 'invoices', uuid: 'folder-uuid' }
      }
    });
    expect(getByTestId('inherited-auth-mode').text.trim()).toBe('API Key');
    expect(getByTestId('auth-inherited-key').getAttribute('value')).toBe('X-API-Key');
    expect(getByTestId('auth-inherited-key').hasAttribute('readonly')).toBe(true);
    expect(getByTestId('auth-inherited-placement').text).toContain('Header');
    expect(getByTestId('auth-inherited-placement').hasAttribute('disabled')).toBe(true);
  });

  it('says No Auth and renders no fields when the source configures no auth', () => {
    const { getByTestId, byTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: { auth: undefined, source: { level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB } }
    });
    expect(getByTestId('inherited-auth-mode').text.trim()).toBe('No Auth');
    expect(byTestId('auth-inherited-fields')).toBeNull();
  });

  it('labels an unknown inherited auth type by its raw type and renders no fields for it', () => {
    const { getByTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: {
        auth: { type: 'future-scheme-v9', secret: 'x' },
        source: { level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB }
      }
    });
    expect(getByTestId('inherited-auth-mode').text.trim()).toBe('future-scheme-v9');
    expect(getByTestId('auth-inherited-source').text.replace(/\s+/g, ' ').trim()).toBe(
      'Auth inherited from C future-scheme-v9'
    );
    const fields = getByTestId('auth-inherited-fields');
    expect(fields.querySelector('input')).toBeNull();
    expect(queryByTestId(fields, 'auth-inherited-placement')).toBeNull();
  });

  it('labels an inherited OAuth 2.0 auth and renders no fields for it', () => {
    const { getByTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: {
        auth: { type: 'oauth2' },
        source: { level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB }
      }
    });
    expect(getByTestId('inherited-auth-mode').text.trim()).toBe('OAuth 2.0');
    expect(getByTestId('auth-inherited-fields').querySelector('input')).toBeNull();
  });

  [
    { type: 'basic', label: 'Basic Auth' },
    { type: 'digest', label: 'Digest Auth' }
  ].forEach(({ type, label }) => {
    it(`shows an inherited ${label} username and masked password read-only`, () => {
      const { getByTestId, byTestId } = renderAuth('inherit', {
        showInherit: true,
        inheritedAuth: {
          auth: { type, username: 'admin', password: 's3cr3t' },
          source: { level: 'folder', name: 'invoices', uuid: 'folder-uuid' }
        }
      });
      expect(getByTestId('inherited-auth-mode').text.trim()).toBe(label);
      const username = getByTestId('auth-inherited-username');
      expect(username.getAttribute('type')).toBe('text');
      expect(username.getAttribute('value')).toBe('admin');
      expect(username.hasAttribute('readonly')).toBe(true);
      const password = getByTestId('auth-inherited-password');
      expect(password.getAttribute('type')).toBe('password');
      expect(password.getAttribute('value')).toBe('s3cr3t');
      expect(password.hasAttribute('readonly')).toBe(true);
      getByTestId('auth-inherited-password-toggle');
      expect(byTestId('auth-username')).toBeNull();
    });
  });

  it('shows all six inherited AWS Signature v4 fields read-only, masking only the secret access key', () => {
    const { getByTestId } = renderAuth('inherit', {
      showInherit: true,
      inheritedAuth: {
        auth: {
          type: 'awsv4',
          accessKeyId: 'AKIA',
          secretAccessKey: 'secret',
          sessionToken: 'session',
          service: 's3',
          region: 'us-east-1',
          profileName: 'default'
        },
        source: { level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB }
      }
    });
    expect(getByTestId('inherited-auth-mode').text.trim()).toBe('AWS Signature v4');
    ['accessKeyId', 'secretAccessKey', 'sessionToken', 'service', 'region', 'profileName'].forEach((field) => {
      const input = getByTestId(`auth-inherited-${field}`);
      expect(input.hasAttribute('readonly')).toBe(true);
      expect(input.getAttribute('type')).toBe(field === 'secretAccessKey' ? 'password' : 'text');
    });
    expect(getByTestId('auth-inherited-region').getAttribute('value')).toBe('us-east-1');
  });

  it('hides the mode select when showModeSelect is false', () => {
    const { byTestId } = renderAuth({ type: 'bearer', token: 'abc' }, { showModeSelect: false });
    expect(byTestId('auth-tab-mode-select')).toBeNull();
  });

  it('falls back to a generic inherit note when the source is not resolved', () => {
    const { root } = renderAuth('inherit', { showInherit: true });
    expect(query(root, '.auth-empty').text.trim()).toBe('Auth inherited from the parent folder or collection.');
  });

  it('shows the own auth form instead of the inherited notice when the request sets its own auth', () => {
    const { byTestId, getByTestId } = renderAuth({ type: 'bearer', token: 'abc' }, {
      showInherit: true,
      inheritedAuth: {
        auth: { type: 'basic', username: 'u', password: 'p' },
        source: { level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB }
      }
    });
    expect(byTestId('auth-inherit-notice')).toBeNull();
    expect(byTestId('auth-inherited-source')).toBeNull();
    getByTestId('auth-token');
  });

  it('renders basic auth with a plain username and a masked, revealable password', () => {
    const { getByTestId } = renderAuth({ type: 'basic', username: 'admin', password: 's3cr3t' });
    expect(getByTestId('auth-username').getAttribute('type')).toBe('text');
    expect(getByTestId('auth-username').getAttribute('value')).toBe('admin');
    expect(getByTestId('auth-password').getAttribute('type')).toBe('password');
    expect(getByTestId('auth-password-toggle').getAttribute('aria-label')).toBe('Show value');
  });

  it('masks the bearer token and exposes a reveal toggle', () => {
    const { getByTestId } = renderAuth({ type: 'bearer', token: 'abc' });
    expect(getByTestId('auth-token').getAttribute('type')).toBe('password');
    expect(getByTestId('auth-token-toggle')).toBeTruthy();
  });

  it('renders apikey with an unmasked value and a header/query placement select', () => {
    const { getByTestId } = renderAuth({ type: 'apikey', key: 'X-Api-Key', value: 'k', placement: 'query' });
    expect(getByTestId('auth-key').getAttribute('type')).toBe('text');
    expect(getByTestId('auth-value').getAttribute('type')).toBe('text');
    expect(PLACEMENT_OPTIONS.map((option) => option.label)).toEqual(['Header', 'Query Params']);
    expect(getByTestId('auth-placement').text).toContain('Query Params');
  });

  it('defaults the apikey placement to Header when none is stored', () => {
    const { getByTestId } = renderAuth({ type: 'apikey', key: '', value: '' });
    expect(getByTestId('auth-placement').text).toContain('Header');
  });

  it('renders digest auth with a masked, revealable password', () => {
    const { getByTestId } = renderAuth({ type: 'digest', username: 'u', password: 'p' });
    expect(getByTestId('auth-username').getAttribute('type')).toBe('text');
    expect(getByTestId('auth-password').getAttribute('type')).toBe('password');
    expect(getByTestId('auth-password-toggle')).toBeTruthy();
  });

  it('renders all six AWS Signature v4 fields, masking only the secret access key', () => {
    const { getByTestId, byTestId } = renderAuth({ type: 'awsv4' });
    const labels = ['accessKeyId', 'secretAccessKey', 'sessionToken', 'service', 'region', 'profileName'];
    labels.forEach((field) => expect(byTestId(`auth-${field}`)).toBeTruthy());
    expect(getByTestId('auth-secretAccessKey').getAttribute('type')).toBe('password');
    expect(getByTestId('auth-secretAccessKey-toggle')).toBeTruthy();
    ['accessKeyId', 'sessionToken', 'service', 'region', 'profileName'].forEach((field) => {
      expect(getByTestId(`auth-${field}`).getAttribute('type')).toBe('text');
      expect(byTestId(`auth-${field}-toggle`)).toBeNull();
    });
  });

  it('uses the exact AWS field labels from Bruno', () => {
    const { root } = renderAuth({ type: 'awsv4' });
    const labels = root.querySelectorAll('.oc-label').map((l) => l.text.trim());
    expect(labels).toEqual(['Access Key ID', 'Secret Access Key', 'Session Token', 'Service', 'Region', 'AWS CLI Profile Name']);
  });
});
