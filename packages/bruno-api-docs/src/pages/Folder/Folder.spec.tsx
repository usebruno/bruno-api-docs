import React from 'react';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query, getByTestId, queryByTestId } from '../../test-utils/dom';
import { Folder } from './Folder';

const collection = {
  info: { name: 'Hotel Booking API' },
  request: { auth: { type: 'bearer', token: 't' } }
} as unknown as OpenCollection;

describe('Folder', () => {
  it('renders the folder name, request count and its configuration', () => {
    const folder: any = {
      info: { name: 'Authentication' },
      request: { auth: 'inherit', scripts: [{ type: 'before-request', code: 'pre()' }] },
      items: [{ info: { type: 'http' } }, { info: { type: 'http' } }, { info: { type: 'http' } }]
    };

    const root = useRenderToDom(<Folder item={folder} collection={collection} />);

    expect(getByTestId(root, 'folder-title').text.trim()).toBe('Authentication');
    expect(getByTestId(root, 'folder-request-count').text.trim()).toBe('3 requests');
    expect(query(root, '[data-testid="folder-section-configuration"] h2').text.trim()).toBe('Folder Configuration');

    expect(getByTestId(root, 'folder-config-auth').text).toContain('Inherited from collection');
    expect(queryByTestId(root, 'folder-config-script')).not.toBeNull();
    expect(queryByTestId(root, 'folder-config-empty')).toBeNull();
  });

  it('shows headers and variables inherited from the collection alongside the folder’s own config', () => {
    const parentCollection = {
      info: { name: 'Billing API' },
      request: {
        headers: [{ name: 'X-Api-Version', value: 'v2' }],
        variables: [{ name: 'baseUrl', value: '{{host}}' }]
      }
    } as unknown as OpenCollection;
    const folder: any = {
      info: { name: 'Invoices' },
      request: { headers: [{ name: 'Accept', value: 'application/json' }] },
      items: [{ info: { type: 'http' } }]
    };

    const root = useRenderToDom(<Folder item={folder} collection={parentCollection} onBreadcrumbClick={() => {}} />);

    const headers = getByTestId(root, 'folder-config-headers');
    expect(headers.text).toContain('Accept'); // own
    expect(headers.text).toContain('X-Api-Version'); // inherited from collection
    expect(headers.text).toContain('1 header inherited');

    const vars = getByTestId(root, 'folder-config-vars');
    expect(vars.text).toContain('baseUrl');
    expect(vars.text).toContain('1 var inherited');

    // each inherited row carries a goto-source link
    expect(root.querySelectorAll('[data-testid="inherited-source"]').length).toBeGreaterThan(0);
    expect(queryByTestId(root, 'folder-config-empty')).toBeNull();
  });

  it('renders the documentation markdown in its own section', () => {
    const folder: any = {
      info: { name: 'Authentication' },
      docs: { content: '# Auth docs\n\nDetailed **markdown** documentation.', type: 'text/markdown' },
      items: []
    };

    const root = useRenderToDom(<Folder item={folder} collection={collection} />);

    expect(query(root, '[data-testid="folder-section-documentation"] h2').text.trim()).toBe('Documentation');
    const docs = getByTestId(root, 'folder-docs');
    expect(query(docs, 'h1').text.trim()).toBe('Auth docs');
    expect(query(docs, 'strong').text.trim()).toBe('markdown');
  });

  it('omits the documentation section when the folder has no docs', () => {
    const folder: any = { info: { name: 'Auth' }, items: [] };

    const root = useRenderToDom(<Folder item={folder} collection={collection} />);

    expect(queryByTestId(root, 'folder-docs')).toBeNull();
    expect(queryByTestId(root, 'folder-section-documentation')).toBeNull();
  });

  it('renders the empty state when the folder has no configuration', () => {
    const folder: any = { info: { name: 'Realtime' }, items: [{ info: { type: 'websocket' } }] };

    const root = useRenderToDom(<Folder item={folder} collection={collection} />);

    expect(getByTestId(root, 'folder-title').text.trim()).toBe('Realtime');
    expect(getByTestId(root, 'folder-request-count').text.trim()).toBe('1 request');

    const empty = getByTestId(root, 'folder-config-empty');
    expect(query(empty, '.empty-state-heading').text.trim()).toBe('No folder configuration');
    expect(queryByTestId(root, 'folder-config-headers')).toBeNull();
  });
});
