import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, query, queryByTestId } from '@/test-utils/dom';
import { HeadersTab } from './HeadersTab';

const noop = () => {};

describe('HeadersTab', () => {
  it('renders the header names and values in the key/value table', () => {
    const root = useRenderToDom(
      <HeadersTab
        headers={[
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'text/html' }
        ]}
        onHeadersChange={noop}
      />
    );
    const cell = (row: string, field: 'name' | 'value') =>
      getByTestId(getByTestId(root, `request-header-row-${row}`), `key-value-table-${field}-input`).getAttribute('value');
    expect(cell('content-type', 'name')).toBe('Content-Type');
    expect(cell('content-type', 'value')).toBe('application/json');
    expect(cell('accept', 'name')).toBe('Accept');
    expect(cell('accept', 'value')).toBe('text/html');
  });

  it('renders the provided description with no standalone title heading', () => {
    const root = useRenderToDom(
      <HeadersTab
        headers={[]}
        onHeadersChange={noop}
        description="Request headers sent with the call"
      />
    );
    // With no title prop, the tab shows only the description — no separate title heading.
    expect(root.querySelector('.title')).toBeNull();
    expect(query(root, '.description').text.trim()).toBe('Request headers sent with the call');
    expect(root.querySelector('[data-testid="bulk-edit-toggle"]')).toBeTruthy();
  });

  it('exposes the Bulk edit toggle button', () => {
    const root = useRenderToDom(<HeadersTab headers={[]} onHeadersChange={noop} />);
    expect(query(root, '[data-testid="bulk-edit-toggle"]').text.trim()).toBe('Bulk edit');
  });

  it('flags a header name with spaces and a value with newlines', () => {
    const root = useRenderToDom(
      <HeadersTab headers={[{ name: 'Bad Name', value: 'line1\nline2' }]} onHeadersChange={noop} />
    );
    expect(root.querySelector('[aria-label="Header name cannot contain spaces or newlines"]')).toBeTruthy();
    expect(root.querySelector('[aria-label="Header value cannot contain newlines"]')).toBeTruthy();
  });

  it('shows no error for a valid header', () => {
    const root = useRenderToDom(
      <HeadersTab headers={[{ name: 'Content-Type', value: 'application/json' }]} onHeadersChange={noop} />
    );
    expect(queryByTestId(root, 'key-value-table-error')).toBeNull();
  });

  it('shows a Description column with authored descriptions (bare string or {content} form)', () => {
    const root = useRenderToDom(
      <HeadersTab
        headers={[
          { name: 'Authorization', value: 'Bearer x', description: 'The bearer token' },
          { name: 'Accept', value: 'text/html', description: { content: 'The media type', type: 'text' } }
        ]}
        onHeadersChange={noop}
      />
    );
    const columns = root.querySelectorAll('thead th').map((th) => th.text.trim());
    expect(columns).toContain('Description');
    expect(root.text).toContain('The bearer token');
    expect(root.text).toContain('The media type');
  });

  it('renders no additional-headers toggle when nothing is inherited, keeping Bulk edit', () => {
    const root = useRenderToDom(<HeadersTab headers={[]} onHeadersChange={noop} />);
    expect(queryByTestId(root, 'toggle-inherited-headers')).toBeNull();
    expect(getByTestId(root, 'bulk-edit-toggle').text.trim()).toBe('Bulk edit');
  });

  describe('inherited headers', () => {
    const inheritedHeaders = [
      { name: 'X-Tenant-Id', value: 'tenant-1', source: { level: 'folder' as const, name: 'customers', uuid: 'folder-uuid' } },
      { name: 'collection-header', value: 'collection-value', source: { level: 'collection' as const, name: 'C', uuid: '__collection_root__' } }
    ];

    it('hides inherited headers by default behind a toggle that counts them', () => {
      const root = useRenderToDom(
        <HeadersTab headers={[]} onHeadersChange={noop} inheritedHeaders={inheritedHeaders} />
      );
      const toggle = getByTestId(root, 'toggle-inherited-headers');
      expect(toggle.text.trim()).toBe('Show Additional Headers (2)');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      expect(queryByTestId(root, 'inherited-headers-section-row')).toBeNull();
      expect(queryByTestId(root, 'inherited-header-row-x-tenant-id')).toBeNull();
      expect(getByTestId(root, 'bulk-edit-toggle').text.trim()).toBe('Bulk edit');
    });

    describe('when additional headers are shown', () => {
      beforeEach(() => vi.stubGlobal('window', { sessionStorage: { getItem: () => 'true', setItem: noop } }));
      afterEach(() => vi.unstubAllGlobals());

      const groupedTab = (
        <HeadersTab headers={[{ name: 'X-Trace', value: 'abc' }]} onHeadersChange={noop} inheritedHeaders={inheritedHeaders} />
      );

      it('groups inherited and request headers under their section rows', () => {
        const root = useRenderToDom(groupedTab);
        expect(getByTestId(root, 'inherited-headers-section-toggle').text.trim()).toBe('Inherited Headers');
        expect(getByTestId(root, 'request-headers-section-toggle').text.trim()).toBe('Request Headers (1)');
        expect(getByTestId(root, 'toggle-inherited-headers').text.trim()).toBe('Hide Additional Headers');
      });

      it('renders inherited headers read-only with a disabled checkbox and keeps request headers editable', () => {
        const root = useRenderToDom(groupedTab);
        const inherited = getByTestId(root, 'inherited-header-row-x-tenant-id');
        expect(inherited.getAttribute('class')).toBe('inherited-header-row');
        expect(getByTestId(inherited, 'key-value-table-name-text').text).toBe('X-Tenant-Id');
        expect(getByTestId(inherited, 'column-checkbox-input').hasAttribute('disabled')).toBe(true);
        getByTestId(inherited, 'inherited-header-source-x-tenant-id');
        const requestRow = getByTestId(root, 'request-header-row-x-trace');
        expect(getByTestId(requestRow, 'key-value-table-name-input').getAttribute('value')).toBe('X-Trace');
      });
    });
  });
});
